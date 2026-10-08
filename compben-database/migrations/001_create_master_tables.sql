-- ============================================
-- MASTER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS divisi (
  id          BIGSERIAL PRIMARY KEY,
  kode        VARCHAR(20) UNIQUE NOT NULL,
  nama        VARCHAR(100) NOT NULL,
  deskripsi   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jabatan (
  id          BIGSERIAL PRIMARY KEY,
  kode        VARCHAR(20) UNIQUE NOT NULL,
  nama        VARCHAR(100) NOT NULL,
  deskripsi   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grade (
  id          BIGSERIAL PRIMARY KEY,
  kode        VARCHAR(20) UNIQUE NOT NULL,
  nama        VARCHAR(100) NOT NULL,
  level       INT,
  min_salary  DECIMAL(18,2),
  max_salary  DECIMAL(18,2),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id          BIGSERIAL PRIMARY KEY,
  kode        VARCHAR(30) UNIQUE NOT NULL,
  nama        VARCHAR(100) NOT NULL,
  deskripsi   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

INSERT INTO roles (kode, nama, deskripsi) VALUES
  ('SUPER_ADMIN', 'Super Admin', 'Full system access'),
  ('ADMIN_CNB',   'Admin C&B',   'Payroll & Compensation'),
  ('HR_ADMIN',    'HR Admin',    'Approval Reimbursement'),
  ('HR',          'HR',          'Master Data Management'),
  ('EMPLOYEE',    'Employee',    'Self Service')
ON CONFLICT (kode) DO NOTHING;