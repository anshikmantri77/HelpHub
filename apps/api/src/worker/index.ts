import 'dotenv/config';
import { Queue, Worker } from 'bullmq';
import { redis } from '../redis';
import { checkSlaBreaches } from './slaBreachJob';

const QUEUE_NAME = 'sla-breach';

async function main() {
  const queue = new Queue(QUEUE_NAME, { connection: redis });

  const schedulers = await queue.getJobSchedulers();
  for (const s of schedulers) {
    await queue.removeJobScheduler(s.key);
  }

  await queue.upsertJobScheduler(
    'sla-check',
    { every: 60_000 },
    { name: 'sla-check', data: {} },
  );

  new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'sla-check') {
        const result = await checkSlaBreaches();
        console.log(`SLA breach check complete: ${JSON.stringify(result)}`);
      }
    },
    { connection: redis },
  );

  console.log('SLA breach worker started');
}

main().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
