import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../db/schema';
import { AppError, ConflictError } from '../../errors/AppError';
import type { RegisterInput, LoginInput, AuthResponse } from '@helphub/shared';

const BCRYPT_COST = 12;
const JWT_EXPIRY = '24h';

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing.length > 0) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      name: input.name,
      role: 'customer',
    })
    .returning();

  if (!user) {
    throw new Error('Failed to create user');
  }

  const role = user.role as 'customer' | 'agent' | 'admin';

  const token = jwt.sign(
    { sub: user.id, email: user.email, role },
    process.env.JWT_SECRET!,
    { expiresIn: JWT_EXPIRY, algorithm: 'HS256' },
  );

  return {
    user: { id: user.id, email: user.email, name: user.name, role },
    token,
  };
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const role = user.role as 'customer' | 'agent' | 'admin';

  const token = jwt.sign(
    { sub: user.id, email: user.email, role },
    process.env.JWT_SECRET!,
    { expiresIn: JWT_EXPIRY, algorithm: 'HS256' },
  );

  return {
    user: { id: user.id, email: user.email, name: user.name, role },
    token,
  };
}
