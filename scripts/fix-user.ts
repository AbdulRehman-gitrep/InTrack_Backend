import 'dotenv/config';
import { DataSource } from 'typeorm';

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  await ds.initialize();

  await ds.query(
    'UPDATE users SET department = $1 WHERE email = $2',
    ['Admin', 'admin@intrack.com'],
  );

  const rows = await ds.query(
    'SELECT id, "fullName", email, role, status, department FROM users',
  );
  console.log(JSON.stringify(rows, null, 2));

  await ds.destroy();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
