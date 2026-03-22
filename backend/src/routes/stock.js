import express from 'express';
import { getStock, updateStock } from '../store.js';

const router = express.Router();

// Get all stock rows
router.get('/', async (req, res) => {
  try {
    const stock = await getStock();
    res.json(stock);
  } catch (err) {
    console.error('Error fetching stock', err);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

// Update a stock row
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { available_quantity, minimum_threshold } = req.body;
  if (available_quantity == null || minimum_threshold == null) {
    return res.status(400).json({ error: 'available_quantity and minimum_threshold are required' });
  }
  try {
    const updated = await updateStock(id, { available_quantity, minimum_threshold });
    if (!updated) return res.status(404).json({ error: 'Stock row not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating stock', err);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

export default router;
