-- ============================================
-- CompBen Platform — Seed 002: Companies
-- Dijalankan: node scripts/run-sql.js seeds/002_companies.sql
-- Idempoten: WHERE NOT EXISTS (tabel tanpa kolom unik alami)
-- ============================================

INSERT INTO companies (nama, alamat, email, no_hp, npwp, deskripsi)
SELECT
    'PT Reethau Cipta Energi',
    NULL,
    'info@reethau.co.id',
    '021-5550123',
    '01.234.567.8-901.000',
    'Perusahaan induk sistem Compensation & Benefit'
WHERE NOT EXISTS (SELECT 1 FROM companies);
