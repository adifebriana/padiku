export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || 'Permintaan gagal diproses.');
    error.status = response.status;
    throw error;
  }

  return payload;
}
