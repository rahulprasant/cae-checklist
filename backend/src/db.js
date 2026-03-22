import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const { Pool } = pkg;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  throw new Error(
    'Missing database connection string. Set DATABASE_URL or Vercel POSTGRES_URL in backend/.env.'
  );
}

export const pool = new Pool({
  connectionString,
});

export const query = (text, params) => pool.query(text, params);

export const getClient = async () => pool.connect();
