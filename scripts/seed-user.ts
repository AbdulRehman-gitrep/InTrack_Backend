import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  await ds.initialize();

  const hash = await bcrypt.hash('Password123!', 10);
  console.log('Hash:', hash);

  const result = await ds.query(
    `INSERT INTO users ("fullName", email, password, role, status, department, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    ['Admin', 'admin@intrack.com', hash, 'ADMIN', 'ACTIVE', 'Software Engineering'],
  );

  if (result.length > 0) {
    console.log('User created with id:', result[0].id);
  } else {
    console.log('User already exists');
  }

  await ds.destroy();
}

seed().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
