import { getClient } from './src/db.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateData() {
  const client = await getClient();
  
  try {
    console.log('📂 Reading data from store.json...');
    const storeData = JSON.parse(
      readFileSync(path.join(__dirname, '../backend/data/store.json'), 'utf8')
    );

    // Start transaction
    await client.query('BEGIN');

    // Insert machines
    console.log(`➕ Inserting ${storeData.machines.length} machines...`);
    for (const machine of storeData.machines) {
      await client.query(
        'INSERT INTO machines (id, name, created_at, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [machine.id, machine.name, machine.created_at, machine.updated_at]
      );
    }

    // Insert materials
    console.log(`➕ Inserting ${storeData.materials.length} materials...`);
    for (const material of storeData.materials) {
      await client.query(
        'INSERT INTO materials (id, machine_id, category, name, quantity, unit, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
        [
          material.id,
          material.machine_id,
          material.category,
          material.name,
          material.quantity,
          material.unit,
          material.created_at,
          material.updated_at,
        ]
      );
    }

    // Insert stock
    console.log(`➕ Inserting ${storeData.stock.length} stock items...`);
    for (const item of storeData.stock) {
      await client.query(
        'INSERT INTO stock (id, material_name, available_quantity, minimum_threshold, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (material_name) DO UPDATE SET available_quantity = EXCLUDED.available_quantity, minimum_threshold = EXCLUDED.minimum_threshold, updated_at = EXCLUDED.updated_at',
        [
          item.id,
          item.material_name,
          item.available_quantity,
          item.minimum_threshold,
          item.created_at,
          item.updated_at,
        ]
      );
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
    console.log(`   ${storeData.machines.length} machines`);
    console.log(`   ${storeData.materials.length} materials`);
    console.log(`   ${storeData.stock.length} stock items`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.release();
  }
}

migrateData();
