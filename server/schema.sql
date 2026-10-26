CREATE TABLE IF NOT EXISTS padiku_readings (
  id SERIAL PRIMARY KEY,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS padiku_control_requests (
  id UUID PRIMARY KEY,
  action TEXT NOT NULL,
  requested_value BOOLEAN NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  requested_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ
);
