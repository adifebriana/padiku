import { readFile } from 'node:fs/promises';
import { pool } from '../server/database.js';

if (!pool) {
  console.error('Isi DATABASE_URL di file .env terlebih dahulu.');
  process.exitCode = 1;
} else {
  try {
    const schema = await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8');
    await pool.query(schema);
    console.log('Tabel Padiku sudah dibuat di PostgreSQL.');
  } catch (error) {
    console.error('Migrasi gagal:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
