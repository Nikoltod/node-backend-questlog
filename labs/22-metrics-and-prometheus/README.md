# Lab 22 - Metrics and Prometheus

## Goal

Understand how to expose application metrics and use Prometheus to monitor a running Node.js service.

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

npm install prom-client@15.1.3
```

## Environment

Create the local environment file from repo root:

```bash
cd ~/node-backend-questlog

cp labs/22-metrics-and-prometheus/.env.example labs/22-metrics-and-prometheus/.env
```

The environment file contains:

```env
HOST=0.0.0.0
PORT=3000

SERVICE_NAME=node-backend-questlog-lab22
NODE_ENV=development
LOG_LEVEL=info

DATABASE_URL=postgresql://questlog:questlog@localhost:5436/questlog

SHUTDOWN_DRAIN_DELAY_MS=3000
SHUTDOWN_TIMEOUT_MS=20000
```

## Start PostgreSQL and Prometheus

From repo root:

```bash
cd ~/node-backend-questlog

sudo docker compose \
  -f labs/22-metrics-and-prometheus/docker/docker-compose.yml \
  up -d
```

Check the containers:

```bash
cd ~/node-backend-questlog

sudo docker compose \
  -f labs/22-metrics-and-prometheus/docker/docker-compose.yml \
  ps
```

## Run API

From repo root:

```bash
cd ~/node-backend-questlog

npm run lab:metrics
```

## Try

General health:

```bash
curl -i http://localhost:3000/health
```

Readiness:

```bash
curl -i http://localhost:3000/health/ready
```

Metrics:

```bash
curl http://localhost:3000/metrics
```

Successful request:

```bash
curl -i http://localhost:3000/demo/success
```

Simulated work:

```bash
curl -i http://localhost:3000/demo/work/250
```

Simulated error:

```bash
curl -i http://localhost:3000/demo/error
```

## Metric Types

A counter only increases until the process restarts.

This lab uses a counter for:

```txt
node_backend_questlog_http_requests_total
```

A gauge can increase and decrease.

This lab uses gauges for:

```txt
node_backend_questlog_http_requests_in_progress
node_backend_questlog_database_up
node_backend_questlog_application_shutting_down
```

A histogram records a distribution of values across buckets.

This lab uses a histogram for:

```txt
node_backend_questlog_http_request_duration_seconds
```

## Generate Traffic

From repo root:

```bash
cd ~/node-backend-questlog

curl -s http://localhost:3000/demo/success > /dev/null
curl -s http://localhost:3000/demo/work/50 > /dev/null
curl -s http://localhost:3000/demo/work/100 > /dev/null
curl -s http://localhost:3000/demo/work/250 > /dev/null
curl -s http://localhost:3000/demo/work/500 > /dev/null
curl -s http://localhost:3000/demo/work/1000 > /dev/null
curl -s http://localhost:3000/demo/error > /dev/null
```

## Inspect Request Counts

From repo root:

```bash
cd ~/node-backend-questlog

curl -s http://localhost:3000/metrics |
  grep "node_backend_questlog_http_requests_total"
```

Metrics use the route pattern:

```txt
/demo/work/:milliseconds
```

They do not use individual raw URLs such as:

```txt
/demo/work/50
/demo/work/100
/demo/work/500
```

This keeps the number of metric label combinations controlled.

## Inspect Request Durations

From repo root:

```bash
cd ~/node-backend-questlog

curl -s http://localhost:3000/metrics |
  grep "node_backend_questlog_http_request_duration_seconds"
```

The histogram exports:

```txt
_bucket
_sum
_count
```

Histogram buckets are cumulative.

## Test Requests in Progress

Start a slow request:

```bash
curl -v http://localhost:3000/slow
```

While it runs, check the gauge:

```bash
curl -s http://localhost:3000/metrics |
  grep "node_backend_questlog_http_requests_in_progress"
```

Expected while the request is running:

```txt
node_backend_questlog_http_requests_in_progress 1
```

After it finishes:

```txt
node_backend_questlog_http_requests_in_progress 0
```

## Test PostgreSQL Availability

With PostgreSQL running:

```bash
curl -s http://localhost:3000/metrics |
  grep "node_backend_questlog_database_up"
```

Expected:

```txt
node_backend_questlog_database_up 1
```

Keep Node.js running and stop PostgreSQL:

```bash
cd ~/node-backend-questlog

sudo docker compose \
  -f labs/22-metrics-and-prometheus/docker/docker-compose.yml \
  stop postgres
```

Check the metric again:

```bash
curl -s http://localhost:3000/metrics |
  grep "node_backend_questlog_database_up"
```

Expected:

```txt
node_backend_questlog_database_up 0
```

Restart PostgreSQL:

```bash
cd ~/node-backend-questlog

sudo docker compose \
  -f labs/22-metrics-and-prometheus/docker/docker-compose.yml \
  start postgres
```

## Open Prometheus

Open Prometheus in a browser:

```txt
http://localhost:9090
```

Open the targets page:

```txt
http://localhost:9090/targets
```

The `node-backend-questlog-lab22` target should report `UP` while the API is running.

## Prometheus Queries

Check whether Prometheus can scrape the application:

```promql
up{job="node-backend-questlog-lab22"}
```

View request counts:

```promql
node_backend_questlog_http_requests_total
```

View request rate:

```promql
rate(
  node_backend_questlog_http_requests_total[5m]
)
```

View server errors:

```promql
node_backend_questlog_http_requests_total{
  status_code="500"
}
```

View active requests:

```promql
node_backend_questlog_http_requests_in_progress
```

View PostgreSQL availability:

```promql
node_backend_questlog_database_up
```

Estimate p95 request duration:

```promql
histogram_quantile(
  0.95,
  sum by (le) (
    rate(
      node_backend_questlog_http_request_duration_seconds_bucket[5m]
    )
  )
)
```

## Test Graceful Shutdown Metrics

Start a slow request:

```bash
curl -v http://localhost:3000/slow
```

Send `SIGTERM` directly to the PID printed by the API:

```bash
kill -TERM <PID>
```

During the shutdown drain delay, check:

```bash
curl -s http://localhost:3000/metrics |
  grep "node_backend_questlog_application_shutting_down"
```

Expected:

```txt
node_backend_questlog_application_shutting_down 1
```

The active request should finish before the API exits.

After the API exits, Prometheus eventually reports:

```promql
up{job="node-backend-questlog-lab22"}
```

as:

```txt
0
```

## Inspect PostgreSQL

Enter the container:

```bash
sudo docker exec -it node_backend_questlog_postgres_lab22 bash
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

## Stop the Lab

Stop the API through its graceful shutdown handler:

```bash
kill -TERM <PID>
```

Stop the containers but keep their volumes:

```bash
cd ~/node-backend-questlog

sudo docker compose \
  -f labs/22-metrics-and-prometheus/docker/docker-compose.yml \
  down
```

Remove the volumes too:

```bash
cd ~/node-backend-questlog

sudo docker compose \
  -f labs/22-metrics-and-prometheus/docker/docker-compose.yml \
  down -v
```

Use `down -v` carefully because it removes PostgreSQL data and stored Prometheus metrics.

## What to Notice

Logs describe individual events and requests.

Metrics describe service behavior over time.

Prometheus pulls metrics from `/metrics`.

Counters track totals.

Gauges track values that can increase and decrease.

Histograms record distributions such as request duration.

Request IDs belong in logs, not metric labels.

Metrics use stable route patterns instead of raw URLs.

The database gauge changes from `1` to `0` when PostgreSQL becomes unavailable.

The application remains alive while PostgreSQL is stopped.

Prometheus continues running after the Node.js API exits and reports the target as down.

## Takeaway

Logs explain individual events.

Metrics reveal patterns across the whole service.

Prometheus repeatedly scrapes the metrics endpoint and stores those measurements as time-series data.

Good observability requires both detailed logs and carefully designed metrics.