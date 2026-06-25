import { env } from './config/env';
import { Redis } from 'ioredis';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const bullConnection = redis;
