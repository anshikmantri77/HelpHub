import { describe, it, expect } from 'vitest';
import { api, createUser, createTicket, bearer } from '../setup';
import { db } from '../../src/db';
import { tickets } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

describe('claim concurrency', () => {
  it('exactly one of 20 simultaneous claims wins, rest 409', async () => {
    const customer = await createUser('customer');
    const agents = await Promise.all(
      Array.from({ length: 20 }, () => createUser('agent')),
    );
    const ticket = await createTicket(customer.id);

    const results = await Promise.all(
      agents.map((a) =>
        api()
          .patch(`/tickets/${ticket.id}/assign`)
          .set('Authorization', bearer(a)),
      ),
    );

    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(19);
    expect(statuses.filter((s) => s >= 500)).toHaveLength(0);

    const [dbTicket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticket.id))
      .limit(1);
    expect(dbTicket!.assigneeId).toBeTruthy();
  });

  it('returns 404 for non-existent ticket (no info leak on existence)', async () => {
    const agent = await createUser('agent');

    const res = await api()
      .patch('/tickets/00000000-0000-0000-0000-000000000000/assign')
      .set('Authorization', bearer(agent));

    expect(res.status).toBe(404);
  });

  it('returns 404 when agent claims a ticket assigned to another agent (no info leak on assignment)', async () => {
    const customer = await createUser('customer');
    const claimingAgent = await createUser('agent');
    const ownerAgent = await createUser('agent');

    // Create a ticket and assign it to ownerAgent directly
    const ticket = await createTicket(customer.id, {
      assigneeId: ownerAgent.id,
      status: 'in_progress',
    });

    // claimingAgent cannot see this ticket (it's assigned to someone else),
    // so they should receive 404, not 409 — proving no info leak.
    const res = await api()
      .patch(`/tickets/${ticket.id}/assign`)
      .set('Authorization', bearer(claimingAgent));

    expect(res.status).toBe(404);
  });

  it('returns 403 when customer tries to claim', async () => {
    const customer = await createUser('customer');
    const ticket = await createTicket(customer.id);

    const res = await api()
      .patch(`/tickets/${ticket.id}/assign`)
      .set('Authorization', bearer(customer));

    expect(res.status).toBe(403);
  });
});
