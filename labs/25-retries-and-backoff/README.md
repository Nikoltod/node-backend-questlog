# Lab 25 - Retries, Exponential Backoff, and Jitter

## Goal

Understand how to retry temporary downstream failures without retrying forever or overwhelming a struggling dependency.

## Run API

From repo root:

```bash
cd ~/node-backend-questlog

npm run lab:retries
```

## Test Without Retries

Reset the test state:

```bash
curl -X DELETE \
  http://127.0.0.1:3000/downstream/state/no-retry-test
```

Call the downstream once:

```bash
curl -i \
  "http://127.0.0.1:3000/demo/no-retry/no-retry-test?failures=2"
```

Expected:

```txt
HTTP/1.1 502 Bad Gateway
```

Only one attempt is made.

## Test Successful Retries

Reset the test state:

```bash
curl -X DELETE \
  http://127.0.0.1:3000/downstream/state/retry-success
```

Run:

```bash
time curl -i \
  "http://127.0.0.1:3000/demo/retry/retry-success?failures=2"
```

Expected:

```txt
Attempt 1 -> 503
wait

Attempt 2 -> 503
wait longer

Attempt 3 -> 200
```

The operation succeeds after three attempts.

## Test Exhausted Retries

Reset the test state:

```bash
curl -X DELETE \
  http://127.0.0.1:3000/downstream/state/retry-exhausted
```

Run:

```bash
time curl -i \
  "http://127.0.0.1:3000/demo/retry/retry-exhausted?failures=10"
```

Expected:

```txt
HTTP/1.1 502 Bad Gateway
```

```json
{
  "error": "DOWNSTREAM_RETRIES_EXHAUSTED",
  "attemptsMade": 4,
  "requestId": "..."
}
```

Retries stop after the configured maximum.

## Test a Permanent Failure

Run:

```bash
curl -i \
  http://127.0.0.1:3000/demo/permanent-error
```

Expected:

```json
{
  "error": "PERMANENT_DOWNSTREAM_ERROR",
  "downstreamStatus": 400,
  "attemptsMade": 1,
  "retried": false,
  "requestId": "..."
}
```

The permanent `400` response is not retried.

## What to Notice

Retries should target failures that may succeed later.

Permanent validation failures should not be retried.

Exponential backoff increases the delay after each failure.

Jitter adds randomness to prevent synchronized retries.

Retries require a maximum attempt count.

The whole retry operation should also have a deadline.

The abort signal is passed into both the downstream request and the backoff delay.

Request logs show every attempt and scheduled delay.

Retries are safest for operations that are idempotent.

## Takeaway

Retrying immediately and forever can make an outage worse.

A controlled retry policy combines:

```txt
failure classification
maximum attempts
exponential backoff
jitter
total deadline
cancellation
```

Retries improve resilience only when they are limited and safe.