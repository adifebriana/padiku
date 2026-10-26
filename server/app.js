import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { pool } from './database.js';
import { sendControlCommand } from './mqtt.js';

const app = express();
const sessions = new Map();
const distFolder = resolve(fileURLToPath(new URL('..', import.meta.url)), 'dist');
const loginUsername = 'padiku';
const loginPassword = 'padiku';

app.use(express.json());

// Do not let the browser reuse old sensor readings.
app.use('/api', (request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});

function getSession(request) {
  const cookies = request.headers.cookie ? request.headers.cookie.split(';') : [];
  const sessionCookie = cookies.find((cookie) => cookie.trim().startsWith('padiku_session='));
  if (!sessionCookie) return null;

  const token = sessionCookie.trim().replace('padiku_session=', '');
  const session = sessions.get(token);
  if (!session) return null;

  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }

  return { token, username: session.username };
}

function saveSessionCookie(response, token, maxAge) {
  const secure = process.env.PADIKU_COOKIE_SECURE === 'true' ? '; Secure' : '';
  response.set(
    'Set-Cookie',
    `padiku_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`,
  );
}

app.get('/api/session', (request, response) => {
  response.json({
    authenticated: Boolean(getSession(request)),
  });
});

app.post('/api/session', (request, response) => {
  if (!request.body || !request.body.username || !request.body.password) {
    response.status(400).json({ error: 'Isi username dan password.' });
    return;
  }

  if (request.body.username !== loginUsername || request.body.password !== loginPassword) {
    response.status(401).json({ error: 'Username atau password tidak sesuai.' });
    return;
  }

  const token = randomUUID();
  const maxAge = 8 * 60 * 60;
  sessions.set(token, { username: loginUsername, expiresAt: Date.now() + maxAge * 1000 });
  saveSessionCookie(response, token, maxAge);
  response.json({ authenticated: true });
});

app.delete('/api/session', (request, response) => {
  const session = getSession(request);
  if (session) sessions.delete(session.token);
  saveSessionCookie(response, '', 0);
  response.json({ authenticated: false });
});

app.get('/api/summary', async (request, response) => {
  if (!pool) {
    response.status(503).json({ error: 'Belum terkoneksi dengan database.' });
    return;
  }

  const temperature = await pool.query(
    `SELECT id, metric, value, unit, recorded_at AS "recordedAt", source
     FROM padiku_readings
     WHERE metric = 'temperature'
     ORDER BY recorded_at DESC
     LIMIT 1`,
  );
  const humidity = await pool.query(
    `SELECT id, metric, value, unit, recorded_at AS "recordedAt", source
     FROM padiku_readings
     WHERE metric = 'humidity'
     ORDER BY recorded_at DESC
     LIMIT 1`,
  );

  response.json({
    latest: {
      temperature: temperature.rows[0] || null,
      humidity: humidity.rows[0] || null,
    },
  });
});

app.get('/api/readings', async (request, response) => {
  if (!pool) {
    response.status(503).json({ error: 'Belum terkoneksi dengan database.' });
    return;
  }

  const metric = request.query.metric;
  if (metric !== 'temperature' && metric !== 'humidity') {
    response.status(400).json({ error: 'Metric harus temperature atau humidity.' });
    return;
  }

  const requestedLimit = Number(request.query.limit) || 30;
  const limit = Math.floor(Math.min(Math.max(requestedLimit, 1), 200));
  const result = await pool.query(
    `SELECT id, metric, value, unit, recorded_at AS "recordedAt", source
     FROM padiku_readings
     WHERE metric = $1
     ORDER BY recorded_at DESC
     LIMIT $2`,
    [metric, limit],
  );
  response.json({ readings: result.rows });
});

app.get('/api/control-requests', async (request, response) => {
  if (!getSession(request)) {
    response.status(401).json({ error: 'Login diperlukan.' });
    return;
  }
  if (!pool) {
    response.status(503).json({ error: 'Belum terkoneksi dengan database.' });
    return;
  }

  const result = await pool.query(
    `SELECT id, action, requested_value AS "requestedValue", status,
            requested_by AS "requestedBy", created_at AS "createdAt",
            published_at AS "publishedAt", acknowledged_at AS "acknowledgedAt"
     FROM padiku_control_requests
     ORDER BY created_at DESC
     LIMIT 20`,
  );
  response.json({ requests: result.rows });
});

app.post('/api/control-requests', async (request, response) => {
  const session = getSession(request);
  if (!session) {
    response.status(401).json({ error: 'Login diperlukan.' });
    return;
  }
  if (!pool) {
    response.status(503).json({ error: 'Belum terkoneksi dengan database.' });
    return;
  }

  const action = request.body?.action;
  const requestedValue = request.body?.requestedValue;
  if (!['machine_power', 'battery', 'emergency_stop'].includes(action)
    || typeof requestedValue !== 'boolean') {
    response.status(400).json({ error: 'Aksi kontrol atau nilainya tidak valid.' });
    return;
  }

  const result = await pool.query(
    `INSERT INTO padiku_control_requests (id, action, requested_value, requested_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, action, requested_value AS "requestedValue", status,
               requested_by AS "requestedBy", created_at AS "createdAt",
               published_at AS "publishedAt"`,
    [randomUUID(), action, requestedValue, session.username],
  );

  const requestToSend = await sendControlCommand(result.rows[0]);
  response.status(201).json({ request: requestToSend });
});

app.use('/api', (request, response) => {
  response.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
});

app.use(express.static(distFolder));

app.use((error, request, response, next) => {
  console.error('Permintaan Padiku gagal:', error.message);
  response.status(error.status || 500).json({ error: 'Permintaan gagal diproses.' });
});

export default app;
