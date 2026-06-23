import { Request, Response, NextFunction } from 'express';
import { redis } from '../redis';
import { TooManyRequestsError } from '../errors/AppError';

export async function ticketCreateLimiter(req: Request, _res: Response, next: NextFunction) {
  try {
    const key = `ratelimit:ticket-create:${req.user!.id}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 60);
    }
    if (count > 5) {
      const ttl = await redis.ttl(key);
      _res.set('Retry-After', String(ttl));
      throw new TooManyRequestsError('Rate limit exceeded.');
    }
    next();
  } catch (err) {
    next(err);
  }
}
