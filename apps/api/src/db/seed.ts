import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from './index';
import { users } from './schema';

const SEED_USERS = [
  { email: 'customer@helphub.test', name: 'Demo Customer', role: 'customer' as const },
  { email: 'agent@helphub.test', name: 'Demo Agent', role: 'agent' as const },
  { email: 'admin@helphub.test', name: 'Demo Admin', role: 'admin' as const },
];

const PASSWORD = 'Password123!';
const BCRYPT_COST = 12;

async function seed() {
  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_COST);

  for (const user of SEED_USERS) {
    await db
      .insert(users)
      .values({
        email: user.email,
        passwordHash,
        name: user.name,
        role: user.role,
      })
      .onConflictDoNothing();

    console.log(`Seeded: ${user.email}`);
  }

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
