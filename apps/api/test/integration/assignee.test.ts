import { describe, it, expect, beforeAll } from 'vitest';
import { api, createUser, bearer } from '../setup';

describe('New ticket with assignee', () => {
  it('creates an assigned ticket with status in_progress if assigneeId is valid', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');

    const res = await api()
      .post('/tickets')
      .set('Authorization', bearer(customer))
      .send({ title: 'Needs agent', description: 'desc', assigneeId: agent.id });

    expect(res.status).toBe(201);
    expect(res.body.assigneeId).toBe(agent.id);
    expect(res.body.status).toBe('in_progress');
  });

  it('rejects invalid/non-agent assigneeId with 422', async () => {
    const customer = await createUser('customer');
    const anotherCustomer = await createUser('customer');

    const res = await api()
      .post('/tickets')
      .set('Authorization', bearer(customer))
      .send({ title: 'Fail me', description: 'desc', assigneeId: anotherCustomer.id });

    expect(res.status).toBe(422);
  });

  it('allows customers to search for agents', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');

    const res = await api()
      .get(`/users/agents?search=${agent.name.substring(0, 5)}`)
      .set('Authorization', bearer(customer));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((a: any) => a.id === agent.id)).toBe(true);
    
    // Ensure passwords are not leaked
    const first = res.body.data[0];
    expect(first.passwordHash).toBeUndefined();
    expect(first.password_hash).toBeUndefined();
  });
});
