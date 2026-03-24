import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { hasDatabase, pool } from './db.js';
import machinesRouter from './routes/machines.js';
import materialsRouter from './routes/materials.js';
import stockRouter from './routes/stock.js';
import checklistRouter from './routes/checklist.js';
import dataRouter from './routes/data.js';

const app = express();

app.use(cors());
app.use(express.json());

const healthLimiter = rateLimit({
  windowMs: 10_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const HEALTH_CACHE_TTL_MS = 10_000;
let healthCache = null;
let healthCacheTime = 0;

app.get('/api/health', healthLimiter, async (req, res) => {
  const now = Date.now();
  if (healthCache && now - healthCacheTime < HEALTH_CACHE_TTL_MS) {
    const statusCode = hasDatabase && !healthCache.db.connected ? 503 : 200;
    return res.status(statusCode).json(healthCache);
  }

  const health = { status: 'ok', db: { configured: hasDatabase } };

  if (hasDatabase && pool) {
    try {
      await pool.query('SELECT 1');
      health.db.connected = true;
    } catch (err) {
      health.db.connected = false;
      health.db.error = err.message;
      health.status = 'degraded';
    }
  }

  healthCache = health;
  healthCacheTime = now;

  const statusCode = hasDatabase && !health.db.connected ? 503 : 200;
  res.status(statusCode).json(health);
});

app.use('/api/machines', machinesRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/stock', stockRouter);
app.use('/api/checklists', checklistRouter);
app.use('/api/data', dataRouter);

export default app;
