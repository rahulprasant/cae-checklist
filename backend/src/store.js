import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getClient, hasDatabase, query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = process.env.VERCEL ? path.resolve('/tmp', 'cae-checklist-data') : path.resolve(__dirname, '../data');
const dataFile = path.resolve(dataDir, 'store.json');
const sourceDataFile = path.resolve(__dirname, '../data/store.json');
const isVercel = Boolean(process.env.VERCEL);

const CATEGORY_RAW = 'raw';
const CATEGORY_FABRICATION = 'fabrication';
const CATEGORY_PURCHASE = 'purchase';

const initialData = {
  meta: {
    nextMachineId: 1,
    nextMaterialId: 1,
    nextStockId: 1,
  },
  machines: [],
  materials: [],
  stock: [],
};

function nowIso() {
  return new Date().toISOString();
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, 'utf8');
  } catch {
    if (isVercel && !hasDatabase) {
      try {
        const source = await readFile(sourceDataFile, 'utf8');
        await writeFile(dataFile, source);
        return;
      } catch {
      }
    }

    await writeFile(dataFile, JSON.stringify(initialData, null, 2));
  }
}

async function loadData() {
  await ensureDataFile();
  const raw = await readFile(dataFile, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    meta: {
      nextMachineId: toNumber(parsed?.meta?.nextMachineId, 1),
      nextMaterialId: toNumber(parsed?.meta?.nextMaterialId, 1),
      nextStockId: toNumber(parsed?.meta?.nextStockId, 1),
    },
    machines: Array.isArray(parsed?.machines) ? parsed.machines : [],
    materials: Array.isArray(parsed?.materials) ? parsed.materials : [],
    stock: Array.isArray(parsed?.stock) ? parsed.stock : [],
  };
}

async function saveData(data) {
  await writeFile(dataFile, JSON.stringify(data, null, 2));
}

async function loadDataFromDb() {
  const [machinesRes, materialsRes, stockRes] = await Promise.all([
    query('SELECT id, name, created_at, updated_at FROM machines ORDER BY name'),
    query(
      'SELECT id, machine_id, category, name, quantity, unit, created_at, updated_at FROM materials ORDER BY name'
    ),
    query(
      'SELECT id, material_name, available_quantity, minimum_threshold, created_at, updated_at FROM stock ORDER BY material_name'
    ),
  ]);

  const machines = machinesRes.rows;
  const materials = materialsRes.rows.map((row) => ({
    ...row,
    quantity: toNumber(row.quantity),
  }));
  const stock = stockRes.rows.map((row) => ({
    ...row,
    available_quantity: toNumber(row.available_quantity),
    minimum_threshold: toNumber(row.minimum_threshold),
  }));

  return {
    meta: {
      nextMachineId: (Math.max(0, ...machines.map((m) => toNumber(m.id))) || 0) + 1,
      nextMaterialId: (Math.max(0, ...materials.map((m) => toNumber(m.id))) || 0) + 1,
      nextStockId: (Math.max(0, ...stock.map((s) => toNumber(s.id))) || 0) + 1,
    },
    machines,
    materials,
    stock,
  };
}

async function loadStoreData() {
  if (hasDatabase) return loadDataFromDb();
  return loadData();
}

function sortByName(items, key = 'name') {
  return [...items].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
}

function getStockByMaterialName(data, materialName) {
  return data.stock.find((row) => row.material_name === materialName);
}

function ensureStockRowForMaterial(data, materialName) {
  const existing = getStockByMaterialName(data, materialName);
  if (existing) return existing;

  const row = {
    id: data.meta.nextStockId++,
    material_name: materialName,
    available_quantity: 0,
    minimum_threshold: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  data.stock.push(row);
  return row;
}

export async function getMachines() {
  if (hasDatabase) {
    const res = await query('SELECT id, name, created_at, updated_at FROM machines ORDER BY name');
    return res.rows;
  }

  const data = await loadData();
  return sortByName(data.machines, 'name').map((m) => ({
    id: m.id,
    name: m.name,
    created_at: m.created_at,
    updated_at: m.updated_at,
  }));
}

export async function createMachine(name) {
  if (hasDatabase) {
    const res = await query(
      'INSERT INTO machines (name) VALUES ($1) RETURNING id, name, created_at, updated_at',
      [name]
    );
    return res.rows[0];
  }

  const data = await loadData();
  const machine = {
    id: data.meta.nextMachineId++,
    name,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  data.machines.push(machine);
  await saveData(data);
  return { id: machine.id, name: machine.name };
}

export async function updateMachine(id, name) {
  if (hasDatabase) {
    const res = await query(
      'UPDATE machines SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, created_at, updated_at',
      [name, Number(id)]
    );
    return res.rows[0] || null;
  }

  const data = await loadData();
  const machine = data.machines.find((m) => m.id === Number(id));
  if (!machine) return null;

  machine.name = name;
  machine.updated_at = nowIso();
  await saveData(data);
  return { id: machine.id, name: machine.name };
}

export async function deleteMachine(id) {
  if (hasDatabase) {
    const res = await query('DELETE FROM machines WHERE id = $1', [Number(id)]);
    return res.rowCount > 0;
  }

  const data = await loadData();
  const machineId = Number(id);
  const index = data.machines.findIndex((m) => m.id === machineId);
  if (index === -1) return false;

  data.machines.splice(index, 1);
  data.materials = data.materials.filter((m) => m.machine_id !== machineId);
  await saveData(data);
  return true;
}

export async function getMaterials(machineId) {
  if (hasDatabase) {
    const sql = machineId
      ? 'SELECT id, machine_id, category, name, quantity, unit, created_at, updated_at FROM materials WHERE machine_id = $1 ORDER BY name'
      : 'SELECT id, machine_id, category, name, quantity, unit, created_at, updated_at FROM materials ORDER BY name';

    const params = machineId ? [Number(machineId)] : [];
    const res = await query(sql, params);
    return res.rows.map((row) => ({ ...row, quantity: toNumber(row.quantity) }));
  }

  const data = await loadData();
  const list = machineId
    ? data.materials.filter((m) => m.machine_id === Number(machineId))
    : data.materials;
  return sortByName(list, 'name');
}

export async function createMaterial({ machine_id, category, name, quantity, unit }) {
  if (hasDatabase) {
    const machineRes = await query('SELECT id FROM machines WHERE id = $1', [Number(machine_id)]);
    if (machineRes.rowCount === 0) return { error: 'Machine not found', status: 404 };

    if (![CATEGORY_RAW, CATEGORY_FABRICATION, CATEGORY_PURCHASE].includes(category)) {
      return { error: 'Invalid material category', status: 400 };
    }

    const materialRes = await query(
      'INSERT INTO materials (machine_id, category, name, quantity, unit) VALUES ($1, $2, $3, $4, $5) RETURNING id, machine_id, category, name, quantity, unit, created_at, updated_at',
      [Number(machine_id), category, name, toNumber(quantity), unit]
    );

    await query(
      'INSERT INTO stock (material_name, available_quantity, minimum_threshold) VALUES ($1, 0, 0) ON CONFLICT (material_name) DO NOTHING',
      [name]
    );

    return { material: { ...materialRes.rows[0], quantity: toNumber(materialRes.rows[0].quantity) } };
  }

  const data = await loadData();
  const machineExists = data.machines.some((m) => m.id === Number(machine_id));
  if (!machineExists) return { error: 'Machine not found', status: 404 };

  if (![CATEGORY_RAW, CATEGORY_FABRICATION, CATEGORY_PURCHASE].includes(category)) {
    return { error: 'Invalid material category', status: 400 };
  }

  const material = {
    id: data.meta.nextMaterialId++,
    machine_id: Number(machine_id),
    category,
    name,
    quantity: toNumber(quantity),
    unit,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  data.materials.push(material);
  ensureStockRowForMaterial(data, name);
  await saveData(data);
  return { material };
}

export async function updateMaterial(id, { category, name, quantity, unit }) {
  if (hasDatabase) {
    if (![CATEGORY_RAW, CATEGORY_FABRICATION, CATEGORY_PURCHASE].includes(category)) {
      return { error: 'Invalid material category', status: 400 };
    }

    const res = await query(
      'UPDATE materials SET category = $1, name = $2, quantity = $3, unit = $4, updated_at = NOW() WHERE id = $5 RETURNING id, machine_id, category, name, quantity, unit, created_at, updated_at',
      [category, name, toNumber(quantity), unit, Number(id)]
    );

    if (!res.rows[0]) return null;

    await query(
      'INSERT INTO stock (material_name, available_quantity, minimum_threshold) VALUES ($1, 0, 0) ON CONFLICT (material_name) DO NOTHING',
      [name]
    );

    return { ...res.rows[0], quantity: toNumber(res.rows[0].quantity) };
  }

  const data = await loadData();
  const material = data.materials.find((m) => m.id === Number(id));
  if (!material) return null;

  if (![CATEGORY_RAW, CATEGORY_FABRICATION, CATEGORY_PURCHASE].includes(category)) {
    return { error: 'Invalid material category', status: 400 };
  }

  material.category = category;
  material.name = name;
  material.quantity = toNumber(quantity);
  material.unit = unit;
  material.updated_at = nowIso();

  ensureStockRowForMaterial(data, name);
  await saveData(data);
  return material;
}

export async function deleteMaterial(id) {
  if (hasDatabase) {
    const res = await query('DELETE FROM materials WHERE id = $1', [Number(id)]);
    return res.rowCount > 0;
  }

  const data = await loadData();
  const materialId = Number(id);
  const index = data.materials.findIndex((m) => m.id === materialId);
  if (index === -1) return false;

  data.materials.splice(index, 1);
  await saveData(data);
  return true;
}

export async function getStock() {
  if (hasDatabase) {
    const res = await query(
      'SELECT id, material_name, available_quantity, minimum_threshold, created_at, updated_at FROM stock ORDER BY material_name'
    );
    return res.rows.map((row) => ({
      id: row.id,
      material_name: row.material_name,
      available_quantity: toNumber(row.available_quantity),
      minimum_threshold: toNumber(row.minimum_threshold),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  const data = await loadData();
  return sortByName(data.stock, 'material_name').map((row) => ({
    id: row.id,
    material_name: row.material_name,
    available_quantity: toNumber(row.available_quantity),
    minimum_threshold: toNumber(row.minimum_threshold),
  }));
}

export async function updateStock(id, { available_quantity, minimum_threshold }) {
  if (hasDatabase) {
    const res = await query(
      'UPDATE stock SET available_quantity = $1, minimum_threshold = $2, updated_at = NOW() WHERE id = $3 RETURNING id, material_name, available_quantity, minimum_threshold, created_at, updated_at',
      [toNumber(available_quantity), toNumber(minimum_threshold), Number(id)]
    );

    if (!res.rows[0]) return null;
    return {
      ...res.rows[0],
      available_quantity: toNumber(res.rows[0].available_quantity),
      minimum_threshold: toNumber(res.rows[0].minimum_threshold),
    };
  }

  const data = await loadData();
  const row = data.stock.find((s) => s.id === Number(id));
  if (!row) return null;

  row.available_quantity = toNumber(available_quantity);
  row.minimum_threshold = toNumber(minimum_threshold);
  row.updated_at = nowIso();

  await saveData(data);

  return {
    id: row.id,
    material_name: row.material_name,
    available_quantity: row.available_quantity,
    minimum_threshold: row.minimum_threshold,
  };
}

function splitByCategory(rows) {
  const rawMaterials = [];
  const fabricationParts = [];
  const purchaseMaterials = [];

  for (const row of rows) {
    const item = {
      name: row.name,
      total_quantity: toNumber(row.total_quantity),
      unit: row.unit,
    };

    if (row.category === CATEGORY_RAW) rawMaterials.push(item);
    else if (row.category === CATEGORY_FABRICATION) fabricationParts.push(item);
    else if (row.category === CATEGORY_PURCHASE) purchaseMaterials.push(item);
  }

  return { rawMaterials, fabricationParts, purchaseMaterials };
}

function aggregateByCategoryAndName(materials, machineIds) {
  const machineCountMap = machineIds.reduce((acc, id) => {
    const machineId = Number(id);
    acc.set(machineId, (acc.get(machineId) || 0) + 1);
    return acc;
  }, new Map());

  const map = new Map();

  for (const material of materials) {
    const machineCount = machineCountMap.get(Number(material.machine_id)) || 0;
    if (machineCount <= 0) continue;

    const key = `${material.category}__${material.name}__${material.unit}`;
    const existing =
      map.get(key) ||
      {
        category: material.category,
        name: material.name,
        unit: material.unit,
        total_quantity: 0,
      };
    existing.total_quantity += toNumber(material.quantity) * machineCount;
    map.set(key, existing);
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function aggregateLoadingChecklist(fabricationParts, purchaseMaterials) {
  const map = new Map();

  const addItems = (items) => {
    for (const item of items) {
      const key = `${item.name}__${item.unit}`;
      const existing = map.get(key) || { ...item, total_quantity: 0 };
      existing.total_quantity += toNumber(item.total_quantity);
      map.set(key, existing);
    }
  };

  addItems(fabricationParts);
  addItems(purchaseMaterials);

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function getMachineGroupName(machineName) {
  const value = String(machineName || '').trim();
  if (!value) return 'Machine';

  const textBeforeNumber = value.match(/^[^\d]+/)?.[0]?.trim();
  if (textBeforeNumber) {
    return textBeforeNumber;
  }

  return value.split(/\s+/)[0] || value;
}

function addMaterialQuantity(map, material) {
  const key = `${material.name}__${material.unit}`;
  const existing = map.get(key) || {
    name: material.name,
    total_quantity: 0,
    unit: material.unit,
  };

  existing.total_quantity += toNumber(material.quantity);
  map.set(key, existing);
}

export async function generateChecklist(machineIds) {
  const data = await loadStoreData();
  const machineCountMap = machineIds.reduce((acc, id) => {
    const machineId = Number(id);
    acc.set(machineId, (acc.get(machineId) || 0) + 1);
    return acc;
  }, new Map());

  const aggregated = aggregateByCategoryAndName(data.materials, machineIds);
  const { rawMaterials, fabricationParts, purchaseMaterials } = splitByCategory(aggregated);
  const loadingChecklist = aggregateLoadingChecklist(fabricationParts, purchaseMaterials);

  // Generate machine-wise loading checklist
  const machineWiseMaterials = {};
  const machineWiseGroups = {};
  const groupedMachineMaterialMap = new Map();
  const groupedMachineNamesMap = new Map();

  for (const [numMachineId, machineCount] of machineCountMap.entries()) {
    const machine = data.machines.find((m) => m.id === numMachineId);
    if (!machine) continue;

    const machineMaterials = data.materials.filter((m) => m.machine_id === numMachineId);
    const machineGroupName = getMachineGroupName(machine.name);
    const groupMap = groupedMachineMaterialMap.get(machineGroupName) || new Map();
    const groupMachineNames = groupedMachineNamesMap.get(machineGroupName) || new Set();
    groupMachineNames.add(machineCount > 1 ? `${machine.name} x${machineCount}` : machine.name);

    for (const mat of machineMaterials) {
      if (mat.category !== CATEGORY_FABRICATION && mat.category !== CATEGORY_PURCHASE) continue;
      addMaterialQuantity(groupMap, {
        ...mat,
        quantity: toNumber(mat.quantity) * machineCount,
      });
    }

    groupedMachineMaterialMap.set(machineGroupName, groupMap);
    groupedMachineNamesMap.set(machineGroupName, groupMachineNames);
  }

  const sortedGroupNames = Array.from(groupedMachineMaterialMap.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  for (const groupName of sortedGroupNames) {
    const rows = Array.from(groupedMachineMaterialMap.get(groupName).values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const machineNames = Array.from(groupedMachineNamesMap.get(groupName) || []).sort((a, b) =>
      a.localeCompare(b)
    );

    if (rows.length > 0) {
      machineWiseMaterials[groupName] = rows;
      machineWiseGroups[groupName] = {
        machines: machineNames,
        materials: rows,
      };
    }
  }

  const lowStockAlerts = [];

  const updatedStockRows = [];
  for (const item of loadingChecklist) {
    const row = getStockByMaterialName(data, item.name);
    if (!row) continue;

    row.available_quantity = Math.max(0, toNumber(row.available_quantity) - toNumber(item.total_quantity));
    row.updated_at = nowIso();
    updatedStockRows.push({ id: row.id, available_quantity: row.available_quantity });

    if (toNumber(row.available_quantity) < toNumber(row.minimum_threshold)) {
      lowStockAlerts.push({
        id: row.id,
        material_name: row.material_name,
        available_quantity: toNumber(row.available_quantity),
        minimum_threshold: toNumber(row.minimum_threshold),
      });
    }
  }

  if (hasDatabase) {
    if (updatedStockRows.length > 0) {
      const client = await getClient();
      try {
        await client.query('BEGIN');
        for (const row of updatedStockRows) {
          await client.query(
            'UPDATE stock SET available_quantity = $1, updated_at = NOW() WHERE id = $2',
            [toNumber(row.available_quantity), row.id]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  } else {
    await saveData(data);
  }

  return {
    rawMaterials,
    fabricationParts,
    purchaseMaterials,
    loadingChecklist,
    machineWiseMaterials,
    machineWiseGroups,
    lowStockAlerts,
  };
}

function isValidSnapshot(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!payload.meta || typeof payload.meta !== 'object') return false;
  if (!Array.isArray(payload.machines)) return false;
  if (!Array.isArray(payload.materials)) return false;
  if (!Array.isArray(payload.stock)) return false;

  const requiredMeta = ['nextMachineId', 'nextMaterialId', 'nextStockId'];
  for (const key of requiredMeta) {
    if (!Number.isFinite(Number(payload.meta[key]))) return false;
  }

  return true;
}

export async function getStoreSnapshot() {
  if (hasDatabase) {
    return loadDataFromDb();
  }
  return loadData();
}

export async function importStoreSnapshot(payload) {
  if (!isValidSnapshot(payload)) {
    return { error: 'Invalid data format', status: 400 };
  }

  if (hasDatabase) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('TRUNCATE TABLE materials, machines, stock RESTART IDENTITY CASCADE');

      for (const machine of payload.machines) {
        await client.query(
          'INSERT INTO machines (id, name, created_at, updated_at) VALUES ($1, $2, $3, $4)',
          [machine.id, machine.name, machine.created_at || nowIso(), machine.updated_at || nowIso()]
        );
      }

      for (const material of payload.materials) {
        await client.query(
          'INSERT INTO materials (id, machine_id, category, name, quantity, unit, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [
            material.id,
            material.machine_id,
            material.category,
            material.name,
            toNumber(material.quantity),
            material.unit,
            material.created_at || nowIso(),
            material.updated_at || nowIso(),
          ]
        );
      }

      for (const stockRow of payload.stock) {
        await client.query(
          'INSERT INTO stock (id, material_name, available_quantity, minimum_threshold, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            stockRow.id,
            stockRow.material_name,
            toNumber(stockRow.available_quantity),
            toNumber(stockRow.minimum_threshold),
            stockRow.created_at || nowIso(),
            stockRow.updated_at || nowIso(),
          ]
        );
      }

      await client.query(
        "SELECT setval(pg_get_serial_sequence('machines','id'), COALESCE((SELECT MAX(id) FROM machines), 1), true)"
      );
      await client.query(
        "SELECT setval(pg_get_serial_sequence('materials','id'), COALESCE((SELECT MAX(id) FROM materials), 1), true)"
      );
      await client.query(
        "SELECT setval(pg_get_serial_sequence('stock','id'), COALESCE((SELECT MAX(id) FROM stock), 1), true)"
      );

      await client.query('COMMIT');
      return { ok: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  await saveData(payload);
  return { ok: true };
}
