# Lab 23 - Load Testing and Event Loop Diagnostics

## Goal

Understand how to load-test a Node.js service and distinguish asynchronous waiting from JavaScript that blocks the event loop.

## Requirement

This lab requires Docker and Docker Compose because PostgreSQL and Prometheus run inside Docker containers.

On Linux, Docker may require sudo:

```bash
sudo docker ps
```

## Install Dependency

From repo root:

```bash
cd ~/node-backend-questlog

npm install --save-dev autocannon
```

## Environment

Create the local environment file from repo root:

```bash
cd ~/node-backend-questlog

cp \
  labs/23-load-testing-and-event-loop/.env.example \
  labs/23-load-testing-and-event-loop/.env
```

The environment file contains:

```env
HOST=0.0.0.0
PORT=3000

SERVICE_NAME=node-backend-questlog-lab23
NODE_ENV=development
LOG_LEVEL=info

DATABASE_URL=postgresql://questlog:questlog@localhost:5437/questlog

EVENT_LOOP_MONITOR_RESOLUTION_MS=20

SHUTDOWN_DRAIN_DELAY_MS=3000
SHUTDOWN_TIMEOUT_MS=20000
```

## Start PostgreSQL and Prometheus

From repo root:

```bash
cd ~/node-backend-questlog

sudo docker compose \
  -f labs/23-load-testing-and-event-loop/docker/docker-compose.yml \
  up -d
```

Check the containers:

```bash
cd ~/node-backend-questlog

sudo docker compose \
  -f labs/23-load-testing-and-event-loop/docker/docker-compose.yml \
  ps
```

## Run API

From repo root:

```bash
cd ~/node-backend-questlog

npm run lab:load-testing
```

## Try

Ping:

```bash
curl -i http://127.0.0.1:3000/demo/ping
```

Non-blocking delay:

```bash
curl -i \
  http://127.0.0.1:3000/demo/async-delay/100
```

Blocking JavaScript:

```bash
curl -i \
  http://127.0.0.1:3000/demo/blocking/100
```

Metrics:

```bash
curl http://127.0.0.1:3000/metrics
```

## Load-Test the Ping Route

Restart the API with reduced logging:

```bash
LOG_LEVEL=warn npm run lab:load-testing
```

Run from repo root:

```bash
cd ~/node-backend-questlog

npm run load:ping
```

This provides a baseline for throughput and latency.

## Load-Test Asynchronous Waiting

Run from repo root:

```bash
cd ~/node-backend-questlog

npm run load:async
```

While the test runs, check the ping route from another terminal:

```bash
curl \
  --max-time 5 \
  -s \
  -o /dev/null \
  -w "Ping duration: %{time_total}s\n" \
  http://127.0.0.1:3000/demo/ping
```

The async route waits for timer Promises, but it does not deliberately block the JavaScript thread.

Other requests should remain comparatively responsive.

## Load-Test Blocking JavaScript

Run from repo root:

```bash
cd ~/node-backend-questlog

npm run load:blocking
```

While the test runs, check the ping route:

```bash
curl \
  --max-time 5 \
  -s \
  -o /dev/null \
  -w "Ping duration: %{time_total}s\n" \
  http://127.0.0.1:3000/demo/ping
```

The ping may become very slow or time out.

The ping route is not expensive.

It is delayed because another route is blocking the event loop.

## Inspect Event-Loop Metrics

Run from repo root:

```bash
cd ~/node-backend-questlog

curl -s http://127.0.0.1:3000/metrics |
  grep "node_backend_questlog_event_loop"
```

Important metrics:

```txt
node_backend_questlog_event_loop_delay_mean_seconds
node_backend_questlog_event_loop_delay_max_seconds
node_backend_questlog_event_loop_delay_p99_seconds
node_backend_questlog_event_loop_utilization_ratio
```

## Open Prometheus

Open:

```txt
http://localhost:9091
```

Open the targets page:

```txt
http://localhost:9091/targets
```

The `node-backend-questlog-lab23` target should report `UP`.

## Prometheus Queries

Event-loop utilization:

```promql
node_backend_questlog_event_loop_utilization_ratio
```

Maximum event-loop delay:

```promql
node_backend_questlog_event_loop_delay_max_seconds
```

p99 event-loop delay:

```promql
node_backend_questlog_event_loop_delay_p99_seconds
```

Request rate by route:

```promql
sum by (route) (
  rate(
    node_backend_questlog_http_requests_total[1m]
  )
)
```

p95 request duration by route:

```promql
histogram_quantile(
  0.95,
  sum by (le, route) (
    rate(
      node_backend_questlog_http_request_duration_seconds_bucket[1m]
    )
  )
)
```

Requests currently running:

```promql
node_backend_questlog_http_requests_in_progress
```

PostgreSQL availability:

```promql
node_backend_questlog_database_up
```

## Test PostgreSQL Failure

Keep Node.js running and stop PostgreSQL:

```bash
cd ~/node-backend-questlog

sudo docker compose \
  -f labs/23-load-testing-and-event-loop/docker/docker-compose.yml \
  stop postgres
```

Test readiness:

```bash
curl -i http://127.0.0.1:3000/health/ready
```

Expected:

```txt
HTTP/1.1 503 Service Unavailable
```

Check the database metric:

```bash
curl -s http://127.0.0.1:3000/metrics |
  grep "node_backend_questlog_database_up"
```

Expected:

```txt
node_backend_questlog_database_up 0
```

The ping endpoint should remain responsive because PostgreSQL failure does not block the event loop.

Restart PostgreSQL:

```bash
cd ~/node-backend-questlog

sudo docker compose \
  -f labs/23-load-testing-and-event-loop/docker/docker-compose.yml \
  start postgres
```

## What to Notice

A slow request does not automatically mean the event loop is blocked.

`await delay()` pauses one async function while Node processes other work.

Blocking JavaScript prevents the event loop from processing unrelated requests.

Under blocking load, even simple health and ping routes become delayed.

Event-loop delay and utilization reveal main-thread pressure.

HTTP histograms reveal which routes have rising latency.

The database can remain reachable while the Node.js event loop is overloaded.

Structured logs explain individual failures.

Metrics reveal service-wide patterns.

Autocannon measures behavior from the client’s point of view.

Verbose request logging can distort a load test, so load tests should use an appropriate log level.

## Takeaway

Async waiting can make one operation slow without freezing the service.

Blocking JavaScript makes the entire Node.js process less responsive.

Load testing, event-loop metrics, HTTP metrics, health checks, and logs work together to reveal the difference.