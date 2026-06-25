import { Request, Response, NextFunction } from 'express';
import { redis } from '../redis';
import { TooManyRequestsError } from '../errors/AppError';

// Atomic Lua script: initialises the key with TTL on first call, then increments.
// Returns [current_count, ttl_seconds]. This eliminates the INCR/EXPIRE race where
// a crash between the two commands would leave a key that never expires.
const rateLimitLua = `
local key   = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call('GET', key)
if current == false then
  redis.call('SET', key, 1, 'EX', window)
  return {1, window}
end
local count = tonumber(current)
if count >= limit then
  local ttl = redis.call('TTL', key)
  return {count, ttl}
end
redis.call('INCR', key)
return {count + 1, redis.call('TTL', key)}
`;

const LIMIT = 5;
const WINDOW = 60; // seconds

export async function ticketCreateLimiter(req: Request, _res: Response, next: NextFunction) {
  try {
    const key = `ratelimit:ticket-create:${req.user!.id}`;
    const result = await redis.eval(rateLimitLua, 1, key, String(LIMIT), String(WINDOW)) as [number, number];
    const [count, ttl] = result;
    if (count > LIMIT) {
      _res.set('Retry-After', String(ttl));
      throw new TooManyRequestsError('Rate limit exceeded.');
    }
    next();
  } catch (err) {
    next(err);
  }
}
