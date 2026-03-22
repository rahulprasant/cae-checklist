import express from 'express';
import { generateChecklist } from '../store.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
  const { machineIds } = req.body;
  if (!Array.isArray(machineIds) || machineIds.length === 0) {
    return res.status(400).json({ error: 'machineIds array is required' });
  }

  try {
    const result = await generateChecklist(machineIds);
    res.json(result);
  } catch (err) {
    console.error('Error generating checklist', err);
    res.status(500).json({ error: 'Failed to generate checklist' });
  }
});

export default router;
