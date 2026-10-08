-- Password: admin123 (hash bcrypt)
INSERT INTO users (
  employee_id, username, nama, email, no_hp,
  password_hash, divisi_id, jabatan_id, grade_id, role_id,
  status, tanggal_masuk
) VALUES (
  'EMP-001',
  'superadmin',
  'Super Administrator',
  'superadmin@reethau.co.id',
  '081234567890',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztqFfFv.K6G6',
  1, 5, 5, 1,
  'ACTIVE', '2020-01-01'
);