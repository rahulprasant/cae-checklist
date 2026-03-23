import express from 'express';
import {
  createMachine,
  deleteMachine,
  getMachines,
  updateMachine,
} from '../store.js';

const router = express.Router();

// Get all machines
router.get('/', async (req, res) => {
  try {
    const machines = await getMachines();
    res.json(machines);
  } catch (err) {
    console.error('Error fetching machines', err);
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
});

// Get single machine by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const machines = await getMachines();
    const machine = machines.find((m) => m.id === parseInt(id));
    if (!machine) return res.status(404).json({ error: 'Machine not found' });
    res.json(machine);
  } catch (err) {
    console.error('Error fetching machine', err);
    res.status(500).json({ error: 'Failed to fetch machine' });
  }
});

// Create machine
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const machine = await createMachine(name);
    res.status(201).json(machine);
  } catch (err) {
    console.error('Error creating machine', err);
    res.status(500).json({ error: 'Failed to create machine' });
  }
});

// Update machine
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const machine = await updateMachine(id, name);
    if (!machine) return res.status(404).json({ error: 'Machine not found' });
    res.json(machine);
  } catch (err) {
    console.error('Error updating machine', err);
    res.status(500).json({ error: 'Failed to update machine' });
  }
});

// Delete machine
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await deleteMachine(id);
    if (!deleted) return res.status(404).json({ error: 'Machine not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting machine', err);
    res.status(500).json({ error: 'Failed to delete machine' });
  }
});

export default router;
