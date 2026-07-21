# Lab 20 - Graceful Shutdown

## Goal

Understand how to stop a Node.js backend without interrupting active requests or abandoning PostgreSQL connections.

## Requirement

This lab requires Docker and Docker Compose because PostgreSQL runs inside a Docker container.

On Linux, Docker may require sudo:

```bash
sudo docker ps
```

## Environment

Create the local environment file from repo root:

```bash
cp labs/20-graceful-shutdown/.env.example labs/20-graceful-shutdown/.env
```

The environment file contains:

```env
HOST=0.0.0.0
PORT=3000
DATABASE_URL=postgresql://questlog:questlog@localhost:5434/questlog
SHUTDOWN_DRAIN_DELAY_MS=3000
SHUTDOWN_TIMEOUT_MS=20000
```

`SHUTDOWN_DRAIN_DELAY_MS` gives infrastructure time to stop routing new traffic before Fastify closes.

`SHUTDOWN_TIMEOUT_MS` prevents graceful shutdown from waiting forever.

## Start PostgreSQL

From repo root:

```bash
sudo docker compose -f labs/20-graceful-shutdown/docker/docker-compose.yml up -d
```

Check the container:

```bash
sudo docker compose -f labs/20-graceful-shutdown/docker/docker-compose.yml ps
```

## Run API

The root `package.json` script should be:

```json
"lab:graceful-shutdown": "node --import tsx labs/20-graceful-shutdown/src/server.ts"
```

From repo root:

```bash
npm run lab:graceful-shutdown
```

The startup log prints the PID of the Node.js process.

Example:

```txt
pid: 12345
```

## Try

Liveness:

```bash
curl -i http://localhost:3000/health/live
```

Readiness:

```bash
curl -i http://localhost:3000/health/ready
```

Slow request:

```bash
curl -v http://localhost:3000/slow
```

The slow request waits ten seconds before responding.

## Test Graceful Shutdown

Start the API and note the Node.js PID printed in the log.

In another terminal, start a slow request:

```bash
curl -v http://localhost:3000/slow
```

While the request is still running, send `SIGTERM` directly to the Node.js process:

```bash
kill -TERM <PID>
```

Replace `<PID>` with the real process ID.

Expected API log order:

```txt
Slow request started
Graceful shutdown started
Waiting for traffic to drain
Closing Fastify server
Slow request finished
Closing PostgreSQL connection pool
PostgreSQL connection pool closed
Graceful shutdown completed
```

The slow request should still receive:

```txt
HTTP/1.1 200 OK
```

```json
{
  "message": "Slow request completed"
}
```

The application exits only after the active request finishes and the PostgreSQL pool closes.

## Test Readiness During Shutdown

Start the API again and note its PID.

Send `SIGTERM`:

```bash
kill -TERM <PID>
```

During the configured drain delay, test readiness:

```bash
curl -i http://localhost:3000/health/ready
```

Expected:

```txt
HTTP/1.1 503 Service Unavailable
```

```json
{
  "status": "not-ready",
  "reason": "shutdown-in-progress"
}
```

The process is still alive, but the application is intentionally no longer ready for new work.

## Test the Global Request Gate

During the shutdown drain delay, try starting a new business request:

```bash
curl -i http://localhost:3000/slow
```

Expected:

```txt
HTTP/1.1 503 Service Unavailable
```

```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "Application shutdown is in progress"
}
```

Requests that started before shutdown are allowed to finish.

Requests arriving after shutdown begins are rejected.

## Compare with Abrupt Shutdown

Start another slow request:

```bash
curl -v http://localhost:3000/slow
```

If the process is terminated abruptly before Fastify sends its response, curl reports:

```txt
curl: (52) Empty reply from server
```

This means the TCP connection was closed without a complete HTTP response.

Graceful shutdown avoids this by allowing active requests to finish before the server closes.

## Test the Shutdown Timeout

Start the API with a five-second shutdown timeout:

```bash
SHUTDOWN_TIMEOUT_MS=5000 npm run lab:graceful-shutdown
```

Start the ten-second request:

```bash
curl -v http://localhost:3000/slow
```

Send `SIGTERM` while the request is running:

```bash
kill -TERM <PID>
```

The request takes ten seconds, but shutdown is allowed only five seconds.

Expected:

```txt
Graceful shutdown timed out
```

The process exits with an error because graceful shutdown could not finish before the deadline.

## Inspect PostgreSQL

Enter the container:

```bash
sudo docker exec -it node_backend_questlog_postgres_lab20 bash
```

Open PostgreSQL:

```bash
psql -U questlog -d questlog
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
sudo docker compose -f labs/20-graceful-shutdown/docker/docker-compose.yml down
```

Remove the database volume too:

```bash
sudo docker compose -f labs/20-graceful-shutdown/docker/docker-compose.yml down -v
```

Use `down -v` carefully because it deletes persisted database data.

## What to Notice

`SIGINT` and `SIGTERM` can start the same shutdown sequence.

The reliable test sends `SIGTERM` directly to the printed Node.js PID.

The application changes its runtime state to shutting down before closing Fastify.

Readiness returns `503 Service Unavailable` once shutdown begins.

A global `onRequest` hook rejects new business requests during shutdown.

Requests that started before shutdown are allowed to finish.

Fastify uses:

```ts
forceCloseConnections: "idle"
```

Idle connections are closed during shutdown, but connections handling active requests are allowed to finish.

Fastify runs the `onClose` hook after active requests finish.

The `onClose` hook closes the PostgreSQL connection pool.

A forced timeout prevents the process from hanging forever.

An abrupt shutdown can produce:

```txt
curl: (52) Empty reply from server
```

A graceful shutdown lets the client receive a complete response before the process exits.

## Takeaway

Starting a backend correctly is only half the job.

A production backend must also stop correctly.

Graceful shutdown stops new work, finishes active work, closes external resources, and then exits.