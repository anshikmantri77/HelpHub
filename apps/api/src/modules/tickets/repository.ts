import { and, eq, or, isNull, count, sql, lt, notInArray, asc, desc } from 'drizzle-orm';
import { db } from '../../db';
import { tickets } from '../../db/schema';
import type { Status } from '@helphub/shared';

type Role = 'customer' | 'agent' | 'admin';

function buildVisibilityPredicate(caller: { id: string; role: Role }) {
  if (caller.role === 'admin') {
    return sql`true`;
  }
  if (caller.role === 'agent') {
    return or(eq(tickets.assigneeId, caller.id), isNull(tickets.assigneeId));
  }
  return eq(tickets.requesterId, caller.id);
}

export async function create(data: typeof tickets.$inferInsert) {
  const [ticket] = await db.insert(tickets).values(data).returning();
  return ticket;
}

export async function findByIdForCaller(
  id: string,
  caller: { id: string; role: Role },
) {
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, id), buildVisibilityPredicate(caller)))
    .limit(1);
  return ticket ?? null;
}

const SORT_COLUMNS = {
  createdAt: tickets.createdAt,
  updatedAt: tickets.updatedAt,
  priority: tickets.priority,
} as const;

export async function listForCaller(
  filters: {
    status?: Status;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assigneeId?: string;
    sort?: 'createdAt' | 'updatedAt' | 'priority';
    order?: 'asc' | 'desc';
    limit: number;
    offset: number;
  },
  caller: { id: string; role: Role },
) {
  const conditions = [buildVisibilityPredicate(caller)];

  if (filters.status) {
    conditions.push(eq(tickets.status, filters.status));
  }
  if (filters.priority) {
    conditions.push(eq(tickets.priority, filters.priority));
  }
  if (filters.assigneeId) {
    conditions.push(eq(tickets.assigneeId, filters.assigneeId));
  }

  const whereClause = and(...conditions);

  const sortColumn = SORT_COLUMNS[filters.sort ?? 'createdAt'];
  const orderFn = filters.order === 'asc' ? asc : desc;

  const data = await db
    .select()
    .from(tickets)
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(filters.limit)
    .offset(filters.offset);

  const [row] = await db
    .select({ total: count() })
    .from(tickets)
    .where(whereClause);

  return { data, total: Number(row!.total) };
}

export async function claim(ticketId: string, agentId: string) {
  const [updated] = await db
    .update(tickets)
    .set({ assigneeId: agentId, status: 'in_progress', updatedAt: new Date() })
    .where(and(eq(tickets.id, ticketId), isNull(tickets.assigneeId), eq(tickets.status, 'open')))
    .returning();
  if (updated) return updated;

  const [existing] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!existing) throw new Error('Ticket not found');
  throw new Error('Ticket already assigned');
}

export async function updateStatus(id: string, status: Status) {
  const [ticket] = await db
    .update(tickets)
    .set({ status, updatedAt: new Date() })
    .where(eq(tickets.id, id))
    .returning();
  return ticket ?? null;
}

export async function assign(id: string, assigneeId: string) {
  const [ticket] = await db
    .update(tickets)
    .set({ assigneeId, updatedAt: new Date() })
    .where(eq(tickets.id, id))
    .returning();
  return ticket ?? null;
}
