import pg from 'pg';

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    password: process.env.DATABASE_PASSWORD,
  });
}

export async function saveReading(metric, value, recordedAt, source) {
  const unit = metric === 'temperature' ? '°C' : '%';

  return pool.query(
    `INSERT INTO padiku_readings (metric, value, unit, recorded_at, source)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, metric, value, unit, recorded_at AS "recordedAt", source`,
    [metric, value, unit, recordedAt, source],
  );
}

export { pool };
