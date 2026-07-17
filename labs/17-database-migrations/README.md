# Lab 17 - Database Migrations

## Goal

Understand how to separate database schema creation from repository runtime logic.

## Requirement

This lab requires Docker and Docker Compose because PostgreSQL runs inside a Docker container.

On Linux, Docker may require sudo:

```bash
sudo docker ps
```

## Start PostgreSQL

From repo root:

```bash
sudo docker compose -f labs/17-database-migrations/docker/docker-compose.yml up -d
```

## Run Migrations

```bash
npm run lab:migrate
```

This creates or updates the database schema using files from:

```txt
labs/17-database-migrations/migrations/
```

## Run API

```bash
npm run lab:migrations
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
  -d '{"title":"Learn database migrations","difficulty":"hard"}'
```

```bash
curl -X PATCH http://localhost:3000/quests/1/complete
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

## Stop PostgreSQL

Stop the container but keep the database volume:

```bash
sudo docker compose -f labs/17-database-migrations/docker/docker-compose.yml down
```

Remove the database volume too:

```bash
sudo docker compose -f labs/17-database-migrations/docker/docker-compose.yml down -v
```

Use `down -v` carefully because it deletes persisted database data.

## What to notice

The repository no longer creates the `quests` table.

The migration runner creates a `schema_migrations` table to remember which migrations already ran.

Each SQL file is applied once.

The repository only handles data access.

## Takeaway

Migrations version your database structure.

Repositories should query and save data.

Schema creation belongs outside normal request-handling code.