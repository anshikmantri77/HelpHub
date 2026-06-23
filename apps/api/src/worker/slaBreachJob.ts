import { lt, and, notInArray, eq } from 'drizzle-orm';
import { db } from '../db';
import { tickets } from '../db/schema';

export async function checkSlaBreaches() {
  const result = await db
    .update(tickets)
    .set({ slaBreached: true })
    .where(
      and(
        lt(tickets.slaDueAt, new Date()),
        notInArray(tickets.status, ['resolved', 'closed']),
        eq(tickets.slaBreached, false),
      ),
    );

  return result;
}
