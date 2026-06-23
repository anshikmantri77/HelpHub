import { describe, it, expect } from 'vitest';
import { api, createUser, bearer } from '../setup';

describe('rate limiting', () => {
  it('returns 429 after 5 rapid ticket creates with Retry-After header', async () => {
    const customer = await createUser('customer');

    const results = [];
    for (let i = 0; i < 6; i++) {
      results.push(
        await api()
          .post('/tickets')
          .set('Authorization', bearer(customer))
          .send({ title: `Ticket ${i}`, description: 'Rate limit test' }),
      );
    }

    const statuses = results.map(r => r.status);
    expect(statuses.filter(s => s === 201)).toHaveLength(5);
    expect(statuses.filter(s => s === 429)).toHaveLength(1);

    const rateLimited = results.find(r => r.status === 429);
    expect(rateLimited!.headers['retry-after']).toBeDefined();
    expect(Number(rateLimited!.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('different customers have independent rate limits', async () => {
    const customerA = await createUser('customer');
    const customerB = await createUser('customer');

    for (let i = 0; i < 6; i++) {
      await api()
        .post('/tickets')
        .set('Authorization', bearer(customerA))
        .send({ title: `Ticket ${i}`, description: 'test' });
    }

    const res = await api()
      .post('/tickets')
      .set('Authorization', bearer(customerB))
      .send({ title: 'Fresh ticket', description: 'test' });

    expect(res.status).toBe(201);
  });
});
