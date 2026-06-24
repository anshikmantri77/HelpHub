import { describe, it, expect, beforeAll } from 'vitest';
import { api, createUser, createTicket, bearer } from '../setup';
import { db } from '../../src/db';
import { tickets, comments } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

describe('ticket authz — get-by-id', () => {
  beforeEach(async () => {
    await db.delete(comments);
    await db.delete(tickets);
  });
  it('returns 200 for own ticket as customer', async () => {
    const customer = await createUser('customer');
    const ticket = await createTicket(customer.id);

    const res = await api()
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', bearer(customer));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticket.id);
  });

  it('returns 404 (not 403) when customer requests another customer\'s ticket', async () => {
    const customerA = await createUser('customer');
    const customerB = await createUser('customer');
    const ticket = await createTicket(customerA.id);

    const res = await api()
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', bearer(customerB));

    expect(res.status).toBe(404);
  });

  it('returns 200 for unassigned ticket as agent', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');
    const ticket = await createTicket(customer.id);

    const res = await api()
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', bearer(agent));

    expect(res.status).toBe(200);
  });

  it('returns 200 for assigned ticket as assigned agent', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');
    const ticket = await createTicket(customer.id, { assigneeId: agent.id });

    const res = await api()
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', bearer(agent));

    expect(res.status).toBe(200);
  });

  it('returns 404 when agent requests another agent\'s assigned ticket', async () => {
    const customer = await createUser('customer');
    const agentA = await createUser('agent');
    const agentB = await createUser('agent');
    const ticket = await createTicket(customer.id, { assigneeId: agentA.id });

    const res = await api()
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', bearer(agentB));

    expect(res.status).toBe(404);
  });

  it('returns 200 for any ticket as admin', async () => {
    const customer = await createUser('customer');
    const admin = await createUser('admin');
    const ticket = await createTicket(customer.id);

    const res = await api()
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', bearer(admin));

    expect(res.status).toBe(200);
  });
});

describe('ticket authz — list', () => {
  beforeEach(async () => {
    await db.delete(comments);
    await db.delete(tickets);
  });

  it('customer only sees own tickets', async () => {
    const customerA = await createUser('customer');
    const customerB = await createUser('customer');

    await createTicket(customerA.id);
    await createTicket(customerB.id);
    await createTicket(customerA.id);

    const res = await api()
      .get('/tickets')
      .set('Authorization', bearer(customerA));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('agent sees unassigned + own assigned tickets', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');

    await createTicket(customer.id); // unassigned
    await createTicket(customer.id, { assigneeId: agent.id }); // assigned to agent
    await createTicket(customer.id, { assigneeId: (await createUser('agent')).id }); // assigned to other agent

    const res = await api()
      .get('/tickets')
      .set('Authorization', bearer(agent));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('admin sees all tickets', async () => {
    const customer = await createUser('customer');
    const admin = await createUser('admin');

    await createTicket(customer.id);
    await createTicket(customer.id);

    const res = await api()
      .get('/tickets')
      .set('Authorization', bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});

describe('ticket authz — create', () => {
  beforeEach(async () => {
    await db.delete(comments);
    await db.delete(tickets);
  });

  it('any authenticated user can create a ticket', async () => {
    const customer = await createUser('customer');

    const res = await api()
      .post('/tickets')
      .set('Authorization', bearer(customer))
      .send({ title: 'New ticket', description: 'Something broke' });

    expect(res.status).toBe(201);
    expect(res.body.requesterId).toBe(customer.id);
  });

  it('creates tickets with every valid priority', async () => {
    const customer = await createUser('customer');

    for (const priority of ['low', 'medium', 'high', 'urgent'] as const) {
      const res = await api()
        .post('/tickets')
        .set('Authorization', bearer(customer))
        .send({ title: `Ticket ${priority}`, description: priority, priority });

      expect(res.status).toBe(201);
      expect(res.body.priority).toBe(priority);
    }
  });

  it('returns slaDueAt and slaBreached in ticket response', async () => {
    const customer = await createUser('customer');

    const res = await api()
      .post('/tickets')
      .set('Authorization', bearer(customer))
      .send({ title: 'SLA test', description: 'Check slaBreached' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('slaDueAt');
    expect(typeof res.body.slaDueAt).toBe('string');
    expect(res.body).toHaveProperty('slaBreached');
    expect(res.body.slaBreached).toBe(false);
  });

  it('returns 401 without auth', async () => {
    const res = await api()
      .post('/tickets')
      .send({ title: 'New ticket', description: 'Something broke' });

    expect(res.status).toBe(401);
  });
});

describe('ticket authz — transitions', () => {
  beforeEach(async () => {
    await db.delete(comments);
    await db.delete(tickets);
  });

  it('customer cannot transition open → in_progress (403)', async () => {
    const customer = await createUser('customer');
    const ticket = await createTicket(customer.id);

    const res = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(customer))
      .send({ status: 'in_progress' });

    expect(res.status).toBe(403);
  });

  it('agent can transition open → in_progress and gets auto-assigned', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');
    const ticket = await createTicket(customer.id);

    const res = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(agent))
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');

    const [updated] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticket.id))
      .limit(1);

    expect(updated!.assigneeId).toBe(agent.id);
  });

  it('unassigned agent cannot transition in_progress → resolved (404 — ticket hidden by visibility)', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');
    const ticket = await createTicket(customer.id, {
      status: 'in_progress',
      assigneeId: (await createUser('agent')).id,
    });

    const res = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(agent))
      .send({ status: 'resolved' });

    expect(res.status).toBe(404);
  });

  it('assigned agent can transition in_progress → resolved', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');
    const ticket = await createTicket(customer.id, {
      status: 'in_progress',
      assigneeId: agent.id,
    });

    const res = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(agent))
      .send({ status: 'resolved' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
  });

  it('requester can transition resolved → closed', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');
    const ticket = await createTicket(customer.id, {
      status: 'resolved',
      assigneeId: agent.id,
    });

    const res = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(customer))
      .send({ status: 'closed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('closed');
  });

  it('assignee can transition resolved → closed', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');
    const ticket = await createTicket(customer.id, {
      status: 'resolved',
      assigneeId: agent.id,
    });

    const res = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(agent))
      .send({ status: 'closed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('closed');
  });

  it('non-requester/assignee customer cannot transition resolved → closed (404 — ticket hidden by visibility)', async () => {
    const customerA = await createUser('customer');
    const customerB = await createUser('customer');
    const agent = await createUser('agent');
    const ticket = await createTicket(customerA.id, {
      status: 'resolved',
      assigneeId: agent.id,
    });

    const res = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(customerB))
      .send({ status: 'closed' });

    expect(res.status).toBe(404);
  });

  it('admin can transition any valid transition', async () => {
    const customer = await createUser('customer');
    const admin = await createUser('admin');
    const ticket = await createTicket(customer.id);

    const res = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(admin))
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  it('requester can reopen resolved ticket, then assigned agent progresses reopened → in_progress', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');
    const ticket = await createTicket(customer.id, {
      status: 'resolved',
      assigneeId: agent.id,
    });

    const reopenRes = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(customer))
      .send({ status: 'reopened' });

    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.status).toBe('reopened');

    const progressRes = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(agent))
      .send({ status: 'in_progress' });

    expect(progressRes.status).toBe(200);
    expect(progressRes.body.status).toBe('in_progress');
  });

  it('customer A cannot reopen customer B\'s resolved ticket (404)', async () => {
    const customerA = await createUser('customer');
    const customerB = await createUser('customer');
    const agent = await createUser('agent');
    const ticket = await createTicket(customerA.id, {
      status: 'resolved',
      assigneeId: agent.id,
    });

    const res = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(customerB))
      .send({ status: 'reopened' });

    expect(res.status).toBe(404);
  });

  it('closed → in_progress is 422 for customer', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');
    const ticket = await createTicket(customer.id, {
      status: 'closed',
      assigneeId: agent.id,
    });

    const res = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(customer))
      .send({ status: 'in_progress' });

    expect(res.status).toBe(422);
  });

  it('closed → in_progress is 422 for agent', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');
    const ticket = await createTicket(customer.id, {
      status: 'closed',
      assigneeId: agent.id,
    });

    const res = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(agent))
      .send({ status: 'in_progress' });

    expect(res.status).toBe(422);
  });

  it('closed → in_progress is 422 for admin', async () => {
    const customer = await createUser('customer');
    const admin = await createUser('admin');
    const ticket = await createTicket(customer.id, { status: 'closed' });

    const res = await api()
      .post(`/tickets/${ticket.id}/transitions`)
      .set('Authorization', bearer(admin))
      .send({ status: 'in_progress' });

    expect(res.status).toBe(422);
  });
});

describe('pagination', () => {
  beforeEach(async () => {
    await db.delete(comments);
    await db.delete(tickets);
  });

  it('returns paginated results with limit and offset', async () => {
    const admin = await createUser('admin');
    const customer = await createUser('customer');

    for (let i = 0; i < 5; i++) {
      await createTicket(customer.id);
    }

    const res = await api()
      .get('/tickets?limit=2&offset=1')
      .set('Authorization', bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.limit).toBe(2);
    expect(res.body.meta.offset).toBe(1);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
  });

  it('defaults to limit 20, offset 0', async () => {
    const admin = await createUser('admin');
    const customer = await createUser('customer');

    await createTicket(customer.id);

    const res = await api()
      .get('/tickets')
      .set('Authorization', bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(20);
    expect(res.body.meta.offset).toBe(0);
  });
});

describe('list filters respect visibility scope', () => {
  beforeEach(async () => {
    await db.delete(comments);
    await db.delete(tickets);
  });

  it('?status= filter applies after visibility scope', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');

    await createTicket(customer.id, { status: 'resolved' });
    await createTicket(customer.id, { status: 'open', assigneeId: agent.id });
    await createTicket(customer.id, { status: 'open' });

    const res = await api()
      .get(`/tickets?status=open`)
      .set('Authorization', bearer(agent));

    expect(res.status).toBe(200);
    res.body.data.forEach((t: { status: string }) => {
      expect(t.status).toBe('open');
    });
  });

  it('?priority=urgent returns only urgent tickets scoped to caller', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');

    await createTicket(customer.id, { priority: 'urgent' });
    await createTicket(customer.id, { priority: 'urgent', assigneeId: agent.id });
    await createTicket(customer.id, { priority: 'high' });

    const res = await api()
      .get('/tickets?priority=urgent')
      .set('Authorization', bearer(agent));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    res.body.data.forEach((t: { priority: string }) => {
      expect(t.priority).toBe('urgent');
    });
  });

  it('?priority= filter respects visibility scope', async () => {
    const customer = await createUser('customer');
    const agent = await createUser('agent');
    const otherAgent = await createUser('agent');

    await createTicket(customer.id, { priority: 'urgent' });
    await createTicket(customer.id, { priority: 'urgent', assigneeId: otherAgent.id });

    const res = await api()
      .get('/tickets?priority=urgent')
      .set('Authorization', bearer(agent));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('sorting', () => {
  beforeEach(async () => {
    await db.delete(comments);
    await db.delete(tickets);
  });

  it('?sort=priority&order=desc returns alphabetical-desc ordering', async () => {
    const admin = await createUser('admin');
    const customer = await createUser('customer');

    await createTicket(customer.id, { priority: 'low' });
    await createTicket(customer.id, { priority: 'high' });
    await createTicket(customer.id, { priority: 'urgent' });

    const res = await api()
      .get('/tickets?sort=priority&order=desc')
      .set('Authorization', bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    const priorities = res.body.data.map((t: { priority: string }) => t.priority);
    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i - 1].localeCompare(priorities[i])).toBeGreaterThanOrEqual(0);
    }
  });

  it('?sort=createdAt&order=asc returns oldest-first', async () => {
    const admin = await createUser('admin');
    const customer = await createUser('customer');

    await createTicket(customer.id, { priority: 'low' });
    const t2 = await createTicket(customer.id, { priority: 'high' });

    const res = await api()
      .get('/tickets?sort=createdAt&order=asc')
      .set('Authorization', bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    const dates = res.body.data.map((t: { createdAt: string }) => new Date(t.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeLessThanOrEqual(dates[i]);
    }
  });
});
