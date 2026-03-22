import express from 'express';
import cors from 'cors';
import machinesRouter from './routes/machines.js';
import materialsRouter from './routes/materials.js';
import stockRouter from './routes/stock.js';
import checklistRouter from './routes/checklist.js';
import dataRouter from './routes/data.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/machines', machinesRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/stock', stockRouter);
app.use('/api/checklists', checklistRouter);
app.use('/api/data', dataRouter);

export default app;
