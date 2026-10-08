# CompBen Database

Database migration & seed untuk CompBen Platform.

## Struktur
- `migrations/` — SQL migration files
- `seeds/` — Seed data
- `functions/` — PostgreSQL functions

## Setup
\`\`\`bash
# Buat database
psql -U postgres -c "CREATE DATABASE compben_dev;"
psql -U postgres -c "CREATE USER compben_user WITH ENCRYPTED PASSWORD 'compben_pass';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE compben_dev TO compben_user;"
\`\`\`