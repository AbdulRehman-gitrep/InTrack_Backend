import 'dotenv/config';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

async function seed() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  const hashedPassword = await bcrypt.hash('Password123!', 12);

  await pool.query(
    `INSERT INTO "users" ("fullName", "email", "password", "role", "status", "department")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      'Admin',
      'admin@intrack.com',
      hashedPassword,
      'ADMIN',
      'ACTIVE',
      'Management',
    ],
  );

  console.log('Admin user created: admin@intrack.com / Password123!');
  await pool.end();
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
