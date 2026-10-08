-- ============================================
-- CompBen Platform — Seed Data
-- Dijalankan: pnpm db:seed
-- Idempoten: semua INSERT memakai ON CONFLICT DO NOTHING
-- ============================================

-- ---------- ROLES ----------
INSERT INTO roles (kode, nama, deskripsi) VALUES
    ('SUPER_ADMIN', 'Super Admin', 'Akses penuh ke seluruh sistem'),
    ('ADMIN_CNB',   'Admin C&B',   'Mengelola payroll, benefit, dan reimbursement'),
    ('HR_ADMIN',    'HR Admin',    'Mengelola approval dan master data HR'),
    ('HR',          'HR',          'Mengelola karyawan dan pengajuan'),
    ('EMPLOYEE',    'Employee',    'Karyawan biasa: profil, payslip, reimbursement')
ON CONFLICT (kode) DO NOTHING;

-- ---------- DIVISI ----------
INSERT INTO divisi (kode, nama) VALUES
    ('DIV-IT',  'Information Technology'),
    ('DIV-HR',  'Human Resources'),
    ('DIV-FIN', 'Finance'),
    ('DIV-OPS', 'Operations'),
    ('DIV-MKT', 'Marketing')
ON CONFLICT (kode) DO NOTHING;

-- ---------- JABATAN ----------
INSERT INTO jabatan (kode, nama) VALUES
    ('JAB-STAF', 'Staff'),
    ('JAB-SPV',  'Supervisor'),
    ('JAB-MGR',  'Manager'),
    ('JAB-DIR',  'Director'),
    ('JAB-CEO',  'CEO')
ON CONFLICT (kode) DO NOTHING;

-- ---------- GRADE ----------
INSERT INTO grade (kode, nama, level, min_salary, max_salary) VALUES
    ('G1', 'Grade 1', 1, 3000000, 5000000),
    ('G2', 'Grade 2', 2, 5000000, 8000000),
    ('G3', 'Grade 3', 3, 8000000, 12000000),
    ('G4', 'Grade 4', 4, 12000000, 18000000),
    ('G5', 'Grade 5', 5, 18000000, 30000000)
ON CONFLICT (kode) DO NOTHING;

-- ---------- SUPER ADMIN ----------
-- password: admin123  (bcrypt cost 12, dibuat via `node generate-hash.js`)
INSERT INTO users (
    employee_id, username, nama, email, no_hp, password_hash,
    divisi_id, jabatan_id, grade_id, role_id,
    status, tanggal_masuk, is_active
) VALUES (
    'EMP-001',
    'superadmin',
    'Super Administrator',
    'superadmin@reethau.co.id',
    '081234567890',
    '$2b$12$q13kZugMaUzwZF/KFXDukO371zBSRFwuZTKlbNWgu5Av6GRTepMxS',
    (SELECT id FROM divisi  WHERE kode = 'DIV-IT'),
    (SELECT id FROM jabatan WHERE kode = 'JAB-CEO'),
    (SELECT id FROM grade   WHERE kode = 'G5'),
    (SELECT id FROM roles   WHERE kode = 'SUPER_ADMIN'),
    'ACTIVE',
    '2020-01-01',
    TRUE
)
ON CONFLICT (username) DO NOTHING;
