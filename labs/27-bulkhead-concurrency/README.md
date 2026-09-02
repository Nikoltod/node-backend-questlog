# Lab 27 - Bulkhead and Concurrency Limiting

## Goal

Understand how to limit concurrent access to an expensive dependency and prevent unlimited work from overwhelming a service.

## Run API

From repo root:

```bash
cd ~/node-backend-questlog

npm run lab:bulkhead
```

## Test Unlimited Concurrency

From repo root:

```bash
cd ~/node-backend-questlog

time curl -s \
  http://127.0.0.1:3000/demo/unlimited
```

Expected approximately:

```json
{
  "mode": "unlimited",
  "operationsRequested": 8,
  "maximumObservedConcurrency": 8
}
```

All eight asynchronous operations start immediately.

## Test the Bulkhead

From repo root:

```bash
cd ~/node-backend-questlog

time curl -s \
  http://127.0.0.1:3000/demo/limited
```

Expected approximately:

```json
{
  "mode": "bulkhead",
  "operationsRequested": 8,
  "successful": 5,
  "rejected": 3,
  "maximumObservedConcurrency": 2
}
```

The bulkhead configuration allows:

```txt
2 running operations
3 queued operations
```

Additional work is rejected.

## Inspect Status

```bash
curl -s \
  http://127.0.0.1:3000/bulkhead/status
```

The response shows:

```txt
active operations
queued operations
maximum concurrency
maximum queue size
```

## What to Notice

The unlimited example starts every Promise immediately.

`Promise.all()` waits for Promises that are already running.

The bulkhead limits how many operations may execute simultaneously.

A bounded queue allows a small amount of temporary overload.

An unlimited queue can create memory growth and extreme request latency.

Once both the execution slots and queue are full, new work is rejected.

Slots must be released even when an operation throws.

Using `finally` guarantees that the bulkhead releases the slot.

Rate limiting controls requests over time.

Bulkheads control simultaneous operations.

Circuit breakers protect against unhealthy dependencies.

Bulkheads protect against too much concurrent work.

Backpressure prevents producers from overwhelming consumers.

## Takeaway

Concurrency is useful only while the system has capacity for it.

A bulkhead deliberately limits simultaneous work so one expensive dependency cannot consume the entire service.

Bounded concurrency plus a bounded queue gives the service a controlled failure mode instead of uncontrolled overload.