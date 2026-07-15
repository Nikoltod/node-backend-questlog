# Lab 16 - PostgreSQL Persistence

## Goal

Understand how to replace file-based storage with PostgreSQL while keeping routes and services mostly unchanged.

## Docker Inspection Commands

This lab runs PostgreSQL inside a Docker container.

Because Docker may require sudo on Linux, use:

```bash
sudo docker ps

## Start Postgres

From repo root:

```bash
docker compose -f labs/16-postgres-persistence/docker/docker-compose.yml up -d
```

## Run

```bash
npm run lab:postgres
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
  -d '{"title":"Persist quests to Postgres","difficulty":"hard"}'
```

```bash
curl -X PATCH http://localhost:3000/quests/1/complete
```

Stop and restart the server, then run:

```bash
curl http://localhost:3000/quests
```

The quest should still exist because it is stored in PostgreSQL.

## Stop Postgres

```bash
docker compose -f labs/16-postgres-persistence/docker/docker-compose.yml down
```

## Structure

```txt
src/
  app.ts
  server.ts
  shared/
    errors/
      app-error.ts
  modules/
    quests/
      quest.routes.ts
      quest.schemas.ts
      quest.types.ts
      quest.repository.ts
      quest.service.ts
docker/
  docker-compose.yml
```

## What to notice

The route layer still talks to the service.

The service still talks to the repository.

Only the repository knows SQL exists.

The repository maps database rows from snake_case into application objects with camelCase.

## Takeaway

PostgreSQL gives durable persistence, constraints, queries, and concurrent access.

The repository protects the rest of the application from database details.