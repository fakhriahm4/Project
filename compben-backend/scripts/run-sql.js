/**
 * Jalankan file SQL terhadap database.
 * Pemakaian: node scripts/run-sql.js <path-ke-file.sql>
 *
 * Contoh: node scripts/run-sql.js migrations/001_init.sql
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const file = process.argv[2];

if (!file) {
  console.error('Cara pakai: node scripts/run-sql.js <file.sql>');
  process.exit(1);
}

const fullPath = path.resolve(process.cwd(), file);

if (!fs.existsSync(fullPath)) {
  console.error(`File tidak ditemukan: ${fullPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(fullPath, 'utf8');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  min: Number(process.env.DB_POOL_MIN) || 1,
  max: Number(process.env.DB_POOL_MAX) || 5,
});

(async () => {
  const client = await pool.connect();
  try {
    console.log(`Menjalankan ${path.relative(process.cwd(), fullPath)} ...`);
    await client.query(sql);
    console.log('OK.');
  } catch (err) {
    console.error(`GAGAL: ${err.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
