export function timeLabel(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function dateLabel(value) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(value);
}

export function timestampLabel(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function valueLabel(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '-';
  return Number(value).toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

export function dataMessage(error) {
  if (!error) return '';
  if (error.status === 503) return error.message;
  return 'Data belum dapat dimuat. Periksa koneksi PostgreSQL.';
}
