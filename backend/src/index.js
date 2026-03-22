import dotenv from 'dotenv';
import app from './server.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const START_PORT = Number(process.env.PORT) || 4001;
const MAX_PORT_ATTEMPTS = 20;

function startServer(port, attempt = 1) {
  const server = app.listen(port, () => {
    console.log(`Backend API running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use, retrying on ${nextPort}...`);
      startServer(nextPort, attempt + 1);
      return;
    }

    console.error('Failed to start backend server', err);
    process.exit(1);
  });
}

startServer(START_PORT);
