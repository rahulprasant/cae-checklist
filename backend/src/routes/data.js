import express from 'express';
import { getStoreSnapshot, importStoreSnapshot } from '../store.js';

const router = express.Router();

router.get('/export', async (req, res) => {
  try {
    const snapshot = await getStoreSnapshot();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cae-checklist-backup-${timestamp}.json"`
    );
    res.status(200).send(JSON.stringify(snapshot, null, 2));
  } catch (err) {
    console.error('Error exporting data', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

router.post('/import', async (req, res) => {
  try {
    const result = await importStoreSnapshot(req.body);
    if (result?.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    res.status(200).json({ message: 'Data imported successfully' });
  } catch (err) {
    console.error('Error importing data', err);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

export default router;
