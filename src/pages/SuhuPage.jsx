import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import AppShell from '../components/AppShell.jsx';
import ReadingTable from '../components/ReadingTable.jsx';
import { dataMessage, timestampLabel, valueLabel } from '../helpers.js';

export default function SuhuPage() {
  const [summary, setSummary] = useState(null);
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const current = summary?.latest?.temperature;

  useEffect(() => {
    let pageIsOpen = true;

    async function loadData() {
      try {
        const summaryResult = await apiRequest('/api/summary');
        const historyResult = await apiRequest('/api/readings?metric=temperature&limit=60');
        if (pageIsOpen) {
          setSummary(summaryResult);
          setReadings(historyResult.readings);
          setError(null);
        }
      } catch (requestError) {
        if (pageIsOpen) setError(requestError);
      } finally {
        if (pageIsOpen) setLoading(false);
      }
    }

    loadData();
    const timer = window.setInterval(loadData, 30_000);
    return () => {
      pageIsOpen = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <AppShell title="Suhu Gabah" active="suhu">
      <section className="current-reading" aria-label="Pembacaan suhu terbaru">
        <span className="reading-value">{valueLabel(current?.value)}</span>
        <span className="reading-unit">Celcius</span>
      </section>
      <p className="sr-only" aria-live="polite">
        {error ? dataMessage(error) : current?.recordedAt
          ? `Diperbarui ${timestampLabel(current.recordedAt)}`
          : 'Belum ada pembacaan terbaru'}
      </p>
      <ReadingTable readings={readings} loading={loading} error={error} label="Suhu" unit="°C" />
    </AppShell>
  );
}
