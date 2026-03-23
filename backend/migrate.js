import { getClient } from './src/db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await getClient();
  try {
    const schema = readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ Database schema applied successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await client.release();
  }
}

runMigration();
