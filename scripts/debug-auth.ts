import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

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

  const users = await ds.query(
    'SELECT id, email, password, role, status, department FROM users',
  );
  console.log('Users in DB:', JSON.stringify(users, null, 2));

  if (users.length > 0) {
    const { password: hash } = users[0];
    const match = await bcrypt.compare('Password123!', hash);
    console.log('Password match test:', match);
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
