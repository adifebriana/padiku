import mqtt from 'mqtt';
import { pool, saveReading } from './database.js';

const brokerUrl = process.env.MQTT_URL;
const telemetryTopic = process.env.MQTT_TOPIC_TELEMETRY || 'padiku/dryer/telemetry';
const commandTopic = process.env.MQTT_TOPIC_COMMANDS || 'padiku/dryer/commands';
const ackTopic = process.env.MQTT_TOPIC_ACKS || 'padiku/dryer/acks';

let client;

async function saveTelemetry(data) {
  const recordedAt = data.recordedAt ? new Date(data.recordedAt) : new Date();
  if (!Number.isFinite(recordedAt.getTime())) return;

  const source = typeof data.source === 'string' ? data.source : 'esp8266';
  const readings = [];

  if (data.metric) {
    readings.push({ metric: data.metric, value: data.value });
  } else {
    if (data.temperature !== undefined) {
      readings.push({ metric: 'temperature', value: data.temperature });
    }
    if (data.humidity !== undefined) {
      readings.push({ metric: 'humidity', value: data.humidity });
    }
  }

  for (const reading of readings) {
    if (!pool) {
      console.error('Belum terkoneksi dengan database.');
      return;
    }
    if (!['temperature', 'humidity'].includes(reading.metric)
      || typeof reading.value !== 'number'
      || !Number.isFinite(reading.value)) {
      console.error('Format data sensor tidak sesuai.');
      return;
    }
    if (reading.metric === 'humidity' && (reading.value < 0 || reading.value > 100)) {
      console.error('Nilai kelembapan harus antara 0 dan 100.');
      return;
    }
  }

  for (const reading of readings) {
    await saveReading(
      reading.metric,
      reading.value,
      recordedAt.toISOString(),
      source,
    );
  }
}

async function saveAcknowledgement(data) {
  if (!pool || !data.commandId) return;
  if (data.status !== 'acknowledged' && data.status !== 'rejected') return;

  await pool.query(
    `UPDATE padiku_control_requests
     SET status = $2, acknowledged_at = now()
     WHERE id = $1 AND status IN ('queued', 'published')`,
    [data.commandId, data.status],
  );
}

export function startMqtt() {
  if (!brokerUrl) {
    console.log('MQTT_URL belum diatur. Controller berjalan tanpa broker.');
    return;
  }

  try {
    client = mqtt.connect(brokerUrl, {
      clientId: process.env.MQTT_CLIENT_ID || 'padiku-controller',
      username: process.env.MQTT_USERNAME || undefined,
      password: process.env.MQTT_PASSWORD || undefined,
    });
  } catch (error) {
    console.error('Tidak bisa menghubungi EMQX:', error.message);
    return;
  }

  client.on('connect', async () => {
    console.log('Controller terhubung ke EMQX.');

    client.subscribe(telemetryTopic, { qos: 1 }, (error) => {
      if (error) console.error('Gagal membaca topik sensor:', error.message);
    });
    client.subscribe(ackTopic, { qos: 1 }, (error) => {
      if (error) console.error('Gagal membaca topik ACK:', error.message);
    });

    try {
      await sendWaitingCommands();
    } catch (error) {
      console.error('Daftar perintah belum bisa dibaca:', error.message);
    }
  });

  client.on('error', (error) => {
    console.error('Koneksi EMQX bermasalah:', error.message);
  });

  client.on('message', async (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      if (topic === telemetryTopic) await saveTelemetry(data);
      if (topic === ackTopic) await saveAcknowledgement(data);
    } catch (error) {
      console.error('Pesan MQTT tidak bisa diproses:', error.message);
    }
  });
}

export async function sendControlCommand(request) {
  if (!client || !client.connected) return request;

  const command = {
    commandId: request.id,
    action: request.action,
    value: request.requestedValue,
    requestedAt: request.createdAt,
  };

  try {
    await client.publishAsync(commandTopic, JSON.stringify(command), { qos: 1 });
  } catch (error) {
    console.error('Perintah belum terkirim ke EMQX:', error.message);
    return request;
  }

  try {
    const result = await pool.query(
      `UPDATE padiku_control_requests
       SET status = 'published', published_at = now()
       WHERE id = $1 AND status = 'queued'
       RETURNING id, action, requested_value AS "requestedValue", status,
                 requested_by AS "requestedBy", created_at AS "createdAt",
                 published_at AS "publishedAt"`,
      [request.id],
    );
    return result.rows[0] || request;
  } catch (error) {
    console.error('Status perintah belum tersimpan:', error.message);
    return request;
  }
}

async function sendWaitingCommands() {
  if (!pool) return;

  const result = await pool.query(
    `SELECT id, action, requested_value AS "requestedValue", created_at AS "createdAt"
     FROM padiku_control_requests
     WHERE status = 'queued'
     ORDER BY created_at ASC`,
  );

  for (const request of result.rows) {
    await sendControlCommand(request);
  }
}
