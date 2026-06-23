import 'dotenv/config';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import type { Express } from 'express';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/db';
import { users, tickets, comments } from '../src/db/schema';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

let server: ReturnType<typeof createServer>;

beforeAll(async () => {
  server = createServer(app);
  await db.delete(comments);
  await db.delete(tickets);
  await db.delete(users);
});

afterAll(() => {
  server?.close();
});

export function getServer() {
  return server;
}

export function getApp(): Express {
  return app;
}

export async function createUser(role: 'customer' | 'agent' | 'admin') {
  const uid = randomUUID().slice(0, 8);
  const email = `test-${role}-${uid}@helphub.test`;
  const passwordHash = await bcrypt.hash('testpass', 4);
  const [user] = await db
    .insert(users)
    .values({ email, name: `Test ${role} ${uid}`, passwordHash, role })
    .returning();

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '1h', algorithm: 'HS256' },
  );

  return { ...user, token };
}

export async function createTicket(requesterId: string, overrides: Partial<typeof tickets.$inferInsert> = {}) {
  const [ticket] = await db
    .insert(tickets)
    .values({
      title: 'Test ticket',
      description: 'Test description',
      priority: 'medium',
      requesterId,
      ...overrides,
    })
    .returning();
  return ticket;
}

export function bearer(user: { token: string }) {
  return `Bearer ${user.token}`;
}

export function api() {
  return request(app);
}
