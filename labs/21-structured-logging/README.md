# Lab 21 - Structured Logging and Request IDs

## Goal

Understand how structured logs and request IDs make individual HTTP requests traceable through a running backend.

## Requirement

This lab requires Docker and Docker Compose because PostgreSQL runs inside a Docker container.

On Linux, Docker may require sudo:

```bash
sudo docker ps
```

## Environment

Create the local environment file from repo root:

```bash
cd ~/node-backend-questlog

cp labs/21-structured-logging/.env.example labs/21-structured-logging/.env
```

The environment file contains:

```env
HOST=0.0.0.0
PORT=3000
DATABASE_URL=postgresql://questlog:questlog@localhost:5435/questlog
LOG_LEVEL=info
SHUTDOWN_DRAIN_DELAY_MS=3000
SHUTDOWN_TIMEOUT_MS=20000
```

`LOG_LEVEL` controls which log levels are emitted.

## Start PostgreSQL

From repo root:

```bash
cd ~/node-backend-questlog

sudo docker compose -f labs/21-structured-logging/docker/docker-compose.yml up -d
```

Check the container:

```bash
cd ~/node-backend-questlog

sudo docker compose -f labs/21-structured-logging/docker/docker-compose.yml ps
```

## Run API

From repo root:

```bash
cd ~/node-backend-questlog

npm run lab:logging
```

The API emits structured JSON logs.

## Try

Generate a request ID automatically:

```bash
curl -i http://localhost:3000/demo/success
```

Supply a request ID:

```bash
curl -i \
  -H "x-request-id: quest-test-123" \
  http://localhost:3000/demo/success
```

Query PostgreSQL:

```bash
curl -i \
  -H "x-request-id: database-test-21" \
  http://localhost:3000/demo/database-time
```

Trigger an error:

```bash
curl -i \
  -H "x-request-id: failure-test-21" \
  http://localhost:3000/demo/error
```

## Test Request ID Generation

When no `x-request-id` header is supplied, the application generates a UUID.

The response contains the ID in both the header and body:

```txt
x-request-id: <generated UUID>
```

```json
{
  "message": "Operation completed successfully",
  "requestId": "<generated UUID>"
}
```

Request-related logs contain the same ID in the `reqId` field.

## Test a Supplied Request ID

From repo root:

```bash
cd ~/node-backend-questlog

curl -i \
  -H "x-request-id: quest-test-123" \
  http://localhost:3000/demo/success
```

Expected response header:

```txt
x-request-id: quest-test-123
```

Expected response body:

```json
{
  "message": "Operation completed successfully",
  "requestId": "quest-test-123"
}
```

The request start, operation, and completion logs all contain:

```json
{
  "reqId": "quest-test-123"
}
```

## Test an Invalid Request ID

From repo root:

```bash
cd ~/node-backend-questlog

curl -i \
  -H "x-request-id: invalid id with spaces" \
  http://localhost:3000/demo/success
```

The invalid value is rejected and replaced with a generated UUID.

## Test Log Levels

The default level is:

```env
LOG_LEVEL=info
```

Start the API with debug logging:

```bash
cd ~/node-backend-questlog

LOG_LEVEL=debug npm run lab:logging
```

Call the database route:

```bash
curl -i \
  -H "x-request-id: debug-test-21" \
  http://localhost:3000/demo/database-time
```

At `debug` level, the logs include both the start and completion of the PostgreSQL query.

## Test Error Correlation

From repo root:

```bash
cd ~/node-backend-questlog

curl -i \
  -H "x-request-id: failure-test-21" \
  http://localhost:3000/demo/error
```

Expected client response:

```txt
HTTP/1.1 500 Internal Server Error
x-request-id: failure-test-21
```

```json
{
  "error": "INTERNAL_SERVER_ERROR",
  "message": "An unexpected error occurred",
  "requestId": "failure-test-21"
}
```

The client receives a safe generic message.

The API log contains the real error and the same request ID.

## Test PostgreSQL Failure Logging

Keep Node.js running and stop PostgreSQL.

From repo root:

```bash
cd ~/node-backend-questlog

sudo docker compose -f labs/21-structured-logging/docker/docker-compose.yml stop postgres
```

Test readiness:

```bash
curl -i \
  -H "x-request-id: readiness-failure-21" \
  http://localhost:3000/health/ready
```

Expected:

```txt
HTTP/1.1 503 Service Unavailable
```

The response and internal PostgreSQL error log contain the same request ID.

Restart PostgreSQL:

```bash
cd ~/node-backend-questlog

sudo docker compose -f labs/21-structured-logging/docker/docker-compose.yml start postgres
```

## Test Graceful Shutdown

Start a slow request:

```bash
curl -v \
  -H "x-request-id: shutdown-test-21" \
  http://localhost:3000/slow
```

Send `SIGTERM` directly to the PID shown in the application startup log:

```bash
kill -TERM <PID>
```

The active request should finish before Fastify closes PostgreSQL and exits.

## Inspect PostgreSQL

Enter the container:

```bash
sudo docker exec -it node_backend_questlog_postgres_lab21 bash
```

Open PostgreSQL:

```bash
psql -U questlog -d questlog
```

Inside PostgreSQL:

```sql
SELECT NOW();
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
cd ~/node-backend-questlog

sudo docker compose -f labs/21-structured-logging/docker/docker-compose.yml down
```

Remove the database volume too:

```bash
cd ~/node-backend-questlog

sudo docker compose -f labs/21-structured-logging/docker/docker-compose.yml down -v
```

Use `down -v` carefully because it deletes persisted database data.

## What to Notice

Structured logs store information in fields instead of burying everything inside sentences.

Every request receives a request ID.

The request ID is returned through the `x-request-id` response header.

Logs created through `request.log` automatically contain the request ID.

An upstream request ID is accepted only when it passes validation.

Invalid or missing request IDs are replaced with generated UUIDs.

The client receives safe error information and a request ID.

The server logs the real error with the same request ID.

Log levels control how much information is emitted without changing application code.

Application lifecycle logs use `app.log`.

Request-specific logs use `request.log`.

## Takeaway

A generic client error is useful when it includes a request ID and the real internal error is logged with that same ID.

Structured logging turns a wall of text into searchable operational data.

Request IDs connect every log produced by one HTTP request.