import { dataMessage, timestampLabel, valueLabel } from '../helpers.js';

export default function ReadingTable({ readings, loading, error, label, unit }) {
  let message = '';
  if (loading) message = 'Memuat data…';
  else if (error) message = dataMessage(error);
  else if (readings.length === 0) message = 'Belum ada pembacaan tersimpan.';

  return (
    <section className="history-card" aria-label={`Riwayat ${label.toLowerCase()}`}>
      <div className="history-head" aria-hidden="true">
        <span>Waktu</span>
        <span>{label}</span>
      </div>
      <div className="history-scroll" role="region" aria-label={`Tabel riwayat ${label.toLowerCase()}`} tabIndex="0">
        <table>
          <thead className="sr-only">
            <tr><th scope="col">Waktu</th><th scope="col">{label}</th></tr>
          </thead>
          <tbody>
            {message ? (
              <tr>
                <td colSpan="2" className={`empty-row${error ? ' is-error' : ''}`}>
                  {message}
                </td>
              </tr>
            ) : readings.map((reading) => (
              <tr key={reading.id}>
                <td>{timestampLabel(reading.recordedAt)}</td>
                <td>{valueLabel(reading.value)} {unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
