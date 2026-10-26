import app from './app.js';
import { startMqtt } from './mqtt.js';

startMqtt();

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Padiku berjalan di port ${port}.`);
});
