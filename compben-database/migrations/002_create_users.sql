CREATE TABLE IF NOT EXISTS users (
  id              BIGSERIAL PRIMARY KEY,
  employee_id     VARCHAR(30) UNIQUE NOT NULL,
  username        VARCHAR(50) UNIQUE NOT NULL,
  nama            VARCHAR(150) NOT NULL,
  email           VARCHAR(150) UNIQUE NOT NULL,
  no_hp           VARCHAR(20),
  password_hash   VARCHAR(255) NOT NULL,
  divisi_id       BIGINT REFERENCES divisi(id),
  jabatan_id      BIGINT REFERENCES jabatan(id),
  grade_id        BIGINT REFERENCES grade(id),
  role_id         BIGINT NOT NULL REFERENCES roles(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'INACTIVE')),
  tanggal_masuk   DATE NOT NULL,
  avatar_url      VARCHAR(255),
  last_login      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP,
  created_by      BIGINT REFERENCES users(id),
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT REFERENCES users(id),
  action        VARCHAR(50) NOT NULL,
  table_name    VARCHAR(100),
  record_id     BIGINT,
  old_value     JSONB,
  new_value     JSONB,
  ip_address    VARCHAR(50),
  user_agent    VARCHAR(255),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);