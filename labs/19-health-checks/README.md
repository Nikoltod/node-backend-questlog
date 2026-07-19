````markdown
# Lab 19 - Health Checks and Readiness

## Goal

Understand the difference between a process being alive and an application being ready to serve traffic.

## Requirement

This lab requires Docker and Docker Compose because PostgreSQL runs inside a Docker container.

On Linux, Docker may require sudo:

```bash
sudo docker ps
```

## Environment

Create the local environment file from repo root:

```bash
cp labs/19-health-checks/.env.example labs/19-health-checks/.env
```

The environment file contains:

```env
HOST=0.0.0.0
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/questlog
```

`HOST` controls which network interfaces Fastify listens on.

`DATABASE_URL` must match the PostgreSQL credentials and port from Docker Compose.

Missing required configuration causes the application to fail immediately instead of starting in a broken state.

## Start PostgreSQL

From repo root:

```bash
sudo docker compose -f labs/19-health-checks/docker/docker-compose.yml up -d
```

Check the container:

```bash
sudo docker compose -f labs/19-health-checks/docker/docker-compose.yml ps
```

## Run API

From repo root:

```bash
npm run lab:health-checks
```

## Try

General health:

```bash
curl -i http://localhost:3000/health
```

Liveness:

```bash
curl -i http://localhost:3000/health/live
```

Readiness:

```bash
curl -i http://localhost:3000/health/ready
```

With PostgreSQL running:

```txt
/health/live  -> 200 OK
/health/ready -> 200 OK
```

## Stop PostgreSQL While the API Is Running

Keep the Node.js API running and stop only PostgreSQL:

```bash
sudo docker compose -f labs/19-health-checks/docker/docker-compose.yml stop postgres
```

Test liveness again:

```bash
curl -i http://localhost:3000/health/live
```

Expected:

```txt
HTTP/1.1 200 OK
```

Test readiness again:

```bash
curl -i http://localhost:3000/health/ready
```

Expected:

```txt
HTTP/1.1 503 Service Unavailable
```

The Node.js process is alive, but the application is not ready because PostgreSQL cannot be reached.

The real PostgreSQL error is logged by Fastify.

The client receives a controlled readiness response instead of an unhelpful generic `INTERNAL_SERVER_ERROR`.

## Restart PostgreSQL

Restart PostgreSQL without restarting the Node.js API:

```bash
sudo docker compose -f labs/19-health-checks/docker/docker-compose.yml start postgres
```

Check the container:

```bash
sudo docker compose -f labs/19-health-checks/docker/docker-compose.yml ps
```

Test readiness again:

```bash
curl -i http://localhost:3000/health/ready
```

Expected:

```txt
HTTP/1.1 200 OK
```

The application becomes ready again without restarting Node.js.

## Inspect PostgreSQL

Enter the container:

```bash
sudo docker exec -it lab19-postgres bash
```

Open PostgreSQL:

```bash
psql -U postgres -d questlog
```

Inside PostgreSQL:

```sql
SELECT 1;
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
sudo docker compose -f labs/19-health-checks/docker/docker-compose.yml down
```

Remove the database volume too:

```bash
sudo docker compose -f labs/19-health-checks/docker/docker-compose.yml down -v
```

Use `down -v` carefully because it deletes persisted database data.

## What to Notice

The liveness endpoint does not query PostgreSQL.

If Fastify can respond, the process is alive.

The readiness endpoint runs:

```sql
SELECT 1;
```

This checks whether the application can obtain a pooled connection and communicate with PostgreSQL.

When PostgreSQL is stopped:

```txt
/health/live  -> 200 OK
/health/ready -> 503 Service Unavailable
```

When PostgreSQL starts again, readiness recovers without restarting Node.js.

Database failures are caught and logged where they happen instead of being hidden behind a generic internal server error.

## Takeaway

Liveness means the process exists and can respond.

Readiness means the application can perform its required work.

Alive does not mean ready.
````
