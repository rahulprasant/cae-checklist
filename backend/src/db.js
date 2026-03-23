import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const { Pool } = pkg;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

export const hasDatabase = Boolean(connectionString);

export const pool = hasDatabase
  ? new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : null;

export const query = (text, params) => {
  if (!pool) {
    throw new Error('Database is not configured. Set DATABASE_URL or POSTGRES_URL.');
  }
  return pool.query(text, params);
};

export const getClient = async () => {
  if (!pool) {
    throw new Error('Database is not configured. Set DATABASE_URL or POSTGRES_URL.');
  }
  return pool.connect();
};
