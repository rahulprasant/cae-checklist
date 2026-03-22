import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = process.env.VERCEL ? path.resolve('/tmp', 'cae-checklist-data') : path.resolve(__dirname, '../data');
const dataFile = path.resolve(dataDir, 'store.json');

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
  const data = await loadData();
  return sortByName(data.machines, 'name').map((m) => ({ id: m.id, name: m.name }));
}

export async function createMachine(name) {
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
  const data = await loadData();
  const machine = data.machines.find((m) => m.id === Number(id));
  if (!machine) return null;

  machine.name = name;
  machine.updated_at = nowIso();
  await saveData(data);
  return { id: machine.id, name: machine.name };
}

export async function deleteMachine(id) {
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
  const data = await loadData();
  const list = machineId
    ? data.materials.filter((m) => m.machine_id === Number(machineId))
    : data.materials;
  return sortByName(list, 'name');
}

export async function createMaterial({ machine_id, category, name, quantity, unit }) {
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
  const data = await loadData();
  const materialId = Number(id);
  const index = data.materials.findIndex((m) => m.id === materialId);
  if (index === -1) return false;

  data.materials.splice(index, 1);
  await saveData(data);
  return true;
}

export async function getStock() {
  const data = await loadData();
  return sortByName(data.stock, 'material_name').map((row) => ({
    id: row.id,
    material_name: row.material_name,
    available_quantity: toNumber(row.available_quantity),
    minimum_threshold: toNumber(row.minimum_threshold),
  }));
}

export async function updateStock(id, { available_quantity, minimum_threshold }) {
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
  const machineIdSet = new Set(machineIds.map((id) => Number(id)));
  const map = new Map();

  for (const material of materials) {
    if (!machineIdSet.has(Number(material.machine_id))) continue;
    const key = `${material.category}__${material.name}__${material.unit}`;
    const existing =
      map.get(key) ||
      {
        category: material.category,
        name: material.name,
        unit: material.unit,
        total_quantity: 0,
      };
    existing.total_quantity += toNumber(material.quantity);
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

export async function generateChecklist(machineIds) {
  const data = await loadData();

  const aggregated = aggregateByCategoryAndName(data.materials, machineIds);
  const { rawMaterials, fabricationParts, purchaseMaterials } = splitByCategory(aggregated);
  const loadingChecklist = aggregateLoadingChecklist(fabricationParts, purchaseMaterials);

  // Generate machine-wise loading checklist
  const machineIdSet = new Set(machineIds.map((id) => Number(id)));
  const machineWiseMaterials = {};
  
  for (const machineId of machineIds) {
    const numMachineId = Number(machineId);
    const machine = data.machines.find((m) => m.id === numMachineId);
    if (!machine) continue;
    
    const machineMaterials = data.materials.filter((m) => m.machine_id === numMachineId);
    const fabrication = machineMaterials.filter((m) => m.category === CATEGORY_FABRICATION);
    const purchase = machineMaterials.filter((m) => m.category === CATEGORY_PURCHASE);
    
    const machineLoadingChecklist = [];
    
    // Add fabrication parts
    for (const mat of fabrication) {
      machineLoadingChecklist.push({
        name: mat.name,
        total_quantity: toNumber(mat.quantity),
        unit: mat.unit,
      });
    }
    
    // Add purchase materials
    for (const mat of purchase) {
      machineLoadingChecklist.push({
        name: mat.name,
        total_quantity: toNumber(mat.quantity),
        unit: mat.unit,
      });
    }
    
    if (machineLoadingChecklist.length > 0) {
      machineWiseMaterials[machine.name] = machineLoadingChecklist;
    }
  }

  const lowStockAlerts = [];

  for (const item of loadingChecklist) {
    const row = getStockByMaterialName(data, item.name);
    if (!row) continue;

    row.available_quantity = Math.max(0, toNumber(row.available_quantity) - toNumber(item.total_quantity));
    row.updated_at = nowIso();

    if (toNumber(row.available_quantity) < toNumber(row.minimum_threshold)) {
      lowStockAlerts.push({
        id: row.id,
        material_name: row.material_name,
        available_quantity: toNumber(row.available_quantity),
        minimum_threshold: toNumber(row.minimum_threshold),
      });
    }
  }

  await saveData(data);

  return {
    rawMaterials,
    fabricationParts,
    purchaseMaterials,
    loadingChecklist,
    machineWiseMaterials,
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
  return loadData();
}

export async function importStoreSnapshot(payload) {
  if (!isValidSnapshot(payload)) {
    return { error: 'Invalid data format', status: 400 };
  }

  await saveData(payload);
  return { ok: true };
}
