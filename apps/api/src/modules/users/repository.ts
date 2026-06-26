import { db } from '../../db';
import { users } from '../../db/schema';
import { and, ilike, inArray, eq } from 'drizzle-orm';

export async function searchAgents(query: string, limit = 20) {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(
      and(
        inArray(users.role, ['agent', 'admin']),
        ilike(users.name, `%${query}%`)
      )
    )
    .limit(limit);
}

export async function findById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}
