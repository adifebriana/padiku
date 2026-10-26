import { createServer as createViteServer } from 'vite';
import app from '../server/app.js';
import { startMqtt } from '../server/mqtt.js';

startMqtt();

const apiPort = Number(process.env.API_PORT || 3001);
const viteServer = await createViteServer();
await viteServer.listen();

app.listen(apiPort, '127.0.0.1', () => {
  console.log(`API Padiku berjalan di port ${apiPort}.`);
});

viteServer.printUrls();
