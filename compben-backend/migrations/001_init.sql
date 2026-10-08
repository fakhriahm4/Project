-- ============================================
-- CompBen Platform — Schema Init
-- Dijalankan: pnpm db:migrate
-- Idempoten: memakai IF NOT EXISTS
-- ============================================

-- ROLES (master role / hak akses)
CREATE TABLE IF NOT EXISTS roles (
    id          BIGSERIAL PRIMARY KEY,
    kode        VARCHAR(50)  NOT NULL UNIQUE,
    nama        VARCHAR(100) NOT NULL,
    deskripsi   TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP
);

-- DIVISI (unit kerja)
CREATE TABLE IF NOT EXISTS divisi (
    id          BIGSERIAL PRIMARY KEY,
    kode        VARCHAR(30)  NOT NULL UNIQUE,
    nama        VARCHAR(150) NOT NULL,
    deskripsi   TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP
);

-- JABATAN
CREATE TABLE IF NOT EXISTS jabatan (
    id          BIGSERIAL PRIMARY KEY,
    kode        VARCHAR(30)  NOT NULL UNIQUE,
    nama        VARCHAR(150) NOT NULL,
    deskripsi   TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP
);

-- GRADE (golongan / rentang gaji)
CREATE TABLE IF NOT EXISTS grade (
    id          BIGSERIAL PRIMARY KEY,
    kode        VARCHAR(30)  NOT NULL UNIQUE,
    nama        VARCHAR(150) NOT NULL,
    level       INTEGER,
    min_salary  NUMERIC,
    max_salary  NUMERIC,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP
);

-- USERS (akun login)
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    employee_id   VARCHAR(30)  NOT NULL UNIQUE,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    nama          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    no_hp         VARCHAR(20),
    password_hash VARCHAR(100) NOT NULL,
    divisi_id     BIGINT       REFERENCES divisi(id),
    jabatan_id    BIGINT       REFERENCES jabatan(id),
    grade_id      BIGINT       REFERENCES grade(id),
    role_id       BIGINT       NOT NULL REFERENCES roles(id),
    status        VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'INACTIVE')),
    tanggal_masuk DATE         NOT NULL,
    avatar_url    VARCHAR(255),
    last_login    TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP,
    created_by    BIGINT       REFERENCES users(id),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS users_role_id_idx    ON users(role_id);
CREATE INDEX IF NOT EXISTS users_divisi_id_idx   ON users(divisi_id);
CREATE INDEX IF NOT EXISTS users_status_idx      ON users(status);
CREATE INDEX IF NOT EXISTS users_is_active_idx   ON users(is_active);

-- AUDIT LOGS (riwayat aktivitas)
CREATE TABLE IF NOT EXISTS audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT     REFERENCES users(id),
    action      VARCHAR(50) NOT NULL,
    table_name  VARCHAR(100),
    record_id   BIGINT,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(255),
    created_at  TIMESTAMP  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_table_name_idx ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
