import { describe, it, expect } from 'vitest';
import { api, createUser, createTicket, bearer } from '../setup';

describe('claim concurrency', () => {
  it('exactly one of two simultaneous claims wins', async () => {
    const customer = await createUser('customer');
    const agentA = await createUser('agent');
    const agentB = await createUser('agent');
    const ticket = await createTicket(customer.id);

    const [r1, r2] = await Promise.all([
      api()
        .patch(`/tickets/${ticket.id}/assign`)
        .set('Authorization', bearer(agentA)),
      api()
        .patch(`/tickets/${ticket.id}/assign`)
        .set('Authorization', bearer(agentB)),
    ]);

    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
  });

  it('returns 404 for non-existent ticket', async () => {
    const agent = await createUser('agent');

    const res = await api()
      .patch('/tickets/00000000-0000-0000-0000-000000000000/assign')
      .set('Authorization', bearer(agent));

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
