# CompBen Platform — Backend

API Express + TypeScript untuk sistem Compensation & Benefit.

## Prasyarat

- Node.js 20+
- PostgreSQL (database `compben_dev`)

## Setup

```bash
pnpm install
cp .env.example .env   # lalu sesuaikan kredensial DB
pnpm db:init           # buat tabel + seed (roles, lookup, super admin)
pnpm dev               # jalankan di http://localhost:3000
```

### Script database

| Perintah | Fungsi |
|---|---|
| `pnpm db:migrate` | Jalankan `migrations/001_init.sql` (idempoten) |
| `pnpm db:seed` | Jalankan `seeds/001_seed.sql` (idempoten) |
| `pnpm db:init` | Migrate + seed sekaligus |

> Tidak butuh `psql` — memakai driver `pg` via `scripts/run-sql.js`.

## Akun awal

| Username | Password | Role |
|---|---|---|
| `superadmin` | `admin123` | SUPER_ADMIN |

Password di-hash dengan bcrypt cost 12. Untuk membuat hash baru: `node generate-hash.js`.

## API

Base URL: `http://localhost:3000/api/v1`

### Auth

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/auth/login` | public | `{ username, password }` → `{ accessToken, user }` (JWT 15 menit) |
| GET | `/auth/me` | Bearer | Profil terbaru dari token |

### Lookups (data referensi utk dropdown)

| Method | Endpoint | Auth |
|---|---|---|
| GET | `/lookups` | SUPER_ADMIN |

Mengembalikan `{ divisi[], jabatan[], grade[], roles[] }`.

### Users (hanya SUPER_ADMIN)

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/users` | List + filter `page, limit, search, role_id, status, sort_by, sort_order` |
| GET | `/users/stats` | `{ total, active, inactive, total_roles }` |
| GET | `/users/:id` | Detail |
| POST | `/users` | Buat user (bcrypt cost 12) |
| PUT | `/users/:id` | Update (password opsional) |
| DELETE | `/users/:id` | Soft delete (`is_active = FALSE`) |

### Envelope response

```jsonc
// sukses
{ "success": true, "data": ..., "message": "..." }
// list menambah meta di top-level
{ "success": true, "data": [], "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
// gagal
{ "success": false, "error": "pesan" }
```

## Struktur

```
src/
├── app.ts               # mounting route + middleware
├── server.ts            # bootstrap
├── config/              # env, database (pg pool), logger
├── middleware/          # auth (JWT), rbac, validate (zod), errorHandler
├── modules/
│   ├── auth/            # login + /me
│   ├── lookup/          # data referensi dropdown
│   └── user/            # CRUD user (routes/controller/service/repository/types)
└── utils/audit.ts       # penulis audit_logs
migrations/  seeds/      # SQL idempoten
scripts/run-sql.js       # menjalankan file SQL via pg
```

## CORS

`CORS_ORIGIN` default `http://localhost:5173` (Vite dev). Frontend memakai
Vite proxy (`/api` → `:3000`), jadi CORS hanya cadangan.
