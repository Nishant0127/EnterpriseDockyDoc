import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Copy .env.example to .env and fill in your Neon connection string.');
}

const sql = neon(process.env.DATABASE_URL);

export default sql;
