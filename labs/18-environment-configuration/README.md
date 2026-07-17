# Lab 18 - Environment Configuration

## Goal

Understand how to centralize environment configuration instead of scattering `process.env` throughout the app.

## Requirement

This lab requires Docker and Docker Compose because PostgreSQL runs inside a Docker container.

On Linux, Docker may require sudo:

```bash
sudo docker ps
```

## Setup

Copy the example environment file:

```bash
cp labs/18-environment-configuration/.env.example labs/18-environment-configuration/.env
```

The `.env` file contains:

```txt
NODE_ENV=development
PORT=3000

POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=questlog
POSTGRES_PASSWORD=questlog
POSTGRES_DB=questlog
```

## Start PostgreSQL

From repo root:

```bash
sudo docker compose -f labs/18-environment-configuration/docker/docker-compose.yml up -d
```

## Run Migrations

```bash
npm run lab:env:migrate
```

## Run API

```bash
npm run lab:env
```

## Try

```bash
curl http://localhost:3000/health
```

```bash
curl http://localhost:3000/quests
```

```bash
curl -X POST http://localhost:3000/quests \
  -H "content-type: application/json" \
  -d '{"title":"Learn environment config","difficulty":"medium"}'
```

## Inspect PostgreSQL

Enter the container:

```bash
sudo docker exec -it node_backend_questlog_postgres bash
```

Open PostgreSQL:

```bash
psql -U questlog -d questlog
```

Inside PostgreSQL:

```sql
\dt
SELECT * FROM schema_migrations;
SELECT * FROM quests;
```

Exit PostgreSQL:

```sql
\q
```

Exit the container shell:

```bash
exit
```

## What to notice

The app now loads config through:

```txt
src/config/config.ts
```

The database module no longer reads `process.env` directly.

The server port comes from config too.

The `.env` file is loaded from the lab folder, not from whichever terminal directory you happen to run the command from.

If a required environment variable is missing, the app fails immediately with a clear error.

## Takeaway

Configuration should be centralized.

Application code should not scatter environment reads everywhere.

Failing fast is better than running with broken hidden config.