import express from 'express';
import {
  createMaterial,
  deleteMaterial,
  getMaterials,
  updateMaterial,
} from '../store.js';

const router = express.Router();

// Get materials, optionally by machine_id
router.get('/', async (req, res) => {
  const { machineId } = req.query;
  try {
    const materials = await getMaterials(machineId);
    res.json(materials);
  } catch (err) {
    console.error('Error fetching materials', err);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// Create material
router.post('/', async (req, res) => {
  const { machine_id, category, name, quantity, unit } = req.body;
  if (!machine_id || !category || !name || quantity == null || !unit) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await createMaterial({ machine_id, category, name, quantity, unit });
    if (result.error) return res.status(result.status || 400).json({ error: result.error });
    res.status(201).json(result.material);
  } catch (err) {
    console.error('Error creating material', err);
    res.status(500).json({ error: 'Failed to create material' });
  }
});

// Update material
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { category, name, quantity, unit } = req.body;
  if (!category || !name || quantity == null || !unit) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await updateMaterial(id, { category, name, quantity, unit });
    if (result?.error) return res.status(result.status || 400).json({ error: result.error });
    if (!result) return res.status(404).json({ error: 'Material not found' });
    res.json(result);
  } catch (err) {
    console.error('Error updating material', err);
    res.status(500).json({ error: 'Failed to update material' });
  }
});

// Delete material
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await deleteMaterial(id);
    if (!deleted) return res.status(404).json({ error: 'Material not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting material', err);
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

export default router;
