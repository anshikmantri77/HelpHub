import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { comments } from '../../db/schema';

type Role = 'customer' | 'agent' | 'admin';

export async function create(data: typeof comments.$inferInsert) {
  const [comment] = await db.insert(comments).values(data).returning();
  return comment;
}

export async function findByTicketId(ticketId: string, caller: { id: string; role: Role }) {
  const conditions = [eq(comments.ticketId, ticketId)];

  if (caller.role === 'customer') {
    conditions.push(eq(comments.isInternal, false));
  }

  const rows = await db
    .select()
    .from(comments)
    .where(and(...conditions))
    .orderBy(comments.createdAt);

  return rows;
}
