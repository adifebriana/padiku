import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import AppShell from '../components/AppShell.jsx';
import { dataMessage, dateLabel, timeLabel, timestampLabel, valueLabel } from '../helpers.js';

export default function HomePage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const temperature = summary?.latest?.temperature;
  const humidity = summary?.latest?.humidity;

  useEffect(() => {
    let pageIsOpen = true;

    async function loadSummary() {
      try {
        const result = await apiRequest('/api/summary');
        if (pageIsOpen) {
          setSummary(result);
          setError(null);
        }
      } catch (requestError) {
        if (pageIsOpen) setError(requestError);
      } finally {
        if (pageIsOpen) setLoading(false);
      }
    }

    loadSummary();
    const timer = window.setInterval(loadSummary, 15_000);
    return () => {
      pageIsOpen = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(clock);
  }, []);

  let latestTime = 0;
  if (temperature?.recordedAt) {
    latestTime = new Date(temperature.recordedAt).getTime();
  }
  if (humidity?.recordedAt) {
    const humidityTime = new Date(humidity.recordedAt).getTime();
    if (humidityTime > latestTime) latestTime = humidityTime;
  }

  let sensorStatus = 'MENUNGGU DATA';
  if (temperature && humidity) {
    if (Number(humidity.value) < 95 && Number(temperature.value) < 30) {
      sensorStatus = 'KERING';
    } else {
      sensorStatus = 'BASAH';
    }
  }

  return (
    <AppShell title="HI KUDANGWANGI" active="home" home>
      <section className="clock-card" aria-label="Waktu saat ini">
        <time className="clock-time">{timeLabel(now)}</time>
        <span className="clock-date">{dateLabel(now)}</span>
      </section>

      <section className="status-card" aria-live="polite" aria-label="Status pembacaan sensor">
        <span className="status-title">STATUS</span>
        <img className="status-arrow" src="/assets/home/3.png" alt="" />
        <span className="status-value">
          {sensorStatus}
        </span>
      </section>

      <div className="metric-grid">
        <a href="#/suhu" className="metric-card temperature-card" aria-label="Buka data suhu gabah">
          <img className="metric-icon" src="/assets/home/4.png" alt="" />
          <span className="metric-value">
            {valueLabel(temperature?.value)}<small>°</small><b>C</b>
          </span>
        </a>
        <a href="#/kelembapan" className="metric-card humidity-card" aria-label="Buka data kelembapan gabah">
          <img className="metric-icon" src="/assets/home/2.png" alt="" />
          <span className="metric-value">
            {valueLabel(humidity?.value)}<b>%</b>
          </span>
        </a>
      </div>

      {(error || loading) && (
        <p className={`data-note${error ? ' is-error' : ''}`} role={error ? 'status' : undefined}>
          {error ? dataMessage(error) : 'Memuat pembacaan sensor…'}
        </p>
      )}
      {latestTime > 0 && !error && (
        <p className="update-note">
          Pembaruan terakhir {timestampLabel(new Date(latestTime).toISOString())}
        </p>
      )}
    </AppShell>
  );
}
