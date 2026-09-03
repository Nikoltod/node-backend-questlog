# Lab 28 - Idempotency and Duplicate Request Protection

## Goal

Understand how idempotency keys protect write operations from accidental duplicate execution.

## Run API

From repo root:

```bash
cd ~/node-backend-questlog

npm run lab:idempotency
```

## Create an Order

```bash
curl -i \
  -X POST \
  -H "content-type: application/json" \
  -H "idempotency-key: checkout-123" \
  -d '{
    "product": "Mechanical Keyboard",
    "quantity": 1
  }' \
  http://127.0.0.1:3000/orders
```

Expected:

```txt
HTTP/1.1 201 Created
idempotency-replayed: false
```

The order is actually created.

## Retry the Same Request

Run the exact request again with the same idempotency key.

Expected:

```txt
HTTP/1.1 200 OK
idempotency-replayed: true
```

The original result is returned.

A second order is not created.

## Check Statistics

```bash
curl -s \
  http://127.0.0.1:3000/stats
```

After sending the same request twice:

```json
{
  "ordersCreated": 1,
  "idempotencyEntries": 1
}
```

## Test an Idempotency Conflict

Reuse the same key with different request data:

```bash
curl -i \
  -X POST \
  -H "content-type: application/json" \
  -H "idempotency-key: checkout-123" \
  -d '{
    "product": "Monitor",
    "quantity": 1
  }' \
  http://127.0.0.1:3000/orders
```

Expected:

```txt
HTTP/1.1 409 Conflict
```

The same idempotency key cannot represent two different operations.

## Test Simultaneous Duplicate Requests

Reset the demo:

```bash
curl -X POST \
  http://127.0.0.1:3000/reset
```

Send two identical requests simultaneously:

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "idempotency-key: simultaneous-123" \
  -d '{"product":"Laptop","quantity":1}' \
  http://127.0.0.1:3000/orders &

curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "idempotency-key: simultaneous-123" \
  -d '{"product":"Laptop","quantity":1}' \
  http://127.0.0.1:3000/orders &

wait
```

Check:

```bash
curl -s \
  http://127.0.0.1:3000/stats
```

Expected:

```json
{
  "ordersCreated": 1,
  "idempotencyEntries": 1
}
```

Both HTTP requests share one in-progress operation.

## What to Notice

An idempotency key represents one logical operation.

The first request executes the operation.

A duplicate request with the same key and payload receives the original result.

The same key used for different data returns a conflict.

The store records the in-progress Promise immediately.

Simultaneous duplicate requests therefore share one operation instead of executing twice.

Failed operations are removed so they may be retried later.

Retries and idempotency work especially well together.

Timeouts can leave clients unsure whether a write succeeded.

An idempotency key allows the client to retry safely.

The in-memory Map used here is educational only.

Real multi-instance services require shared idempotency storage such as Redis or PostgreSQL.

## Takeaway

Retries are useful for transient failures but can duplicate side effects.

Idempotency turns repeated requests for the same logical operation into one execution.

For operations such as payments and orders, this is a critical resilience pattern.