# Lab 24 - Timeouts and Cancellation

## Goal

Understand the difference between returning a timeout response and actually cancelling unfinished asynchronous work.

## Run API

From repo root:

```bash
cd ~/node-backend-questlog

npm run lab:timeouts
```

## Test Normal Completion

From repo root:

```bash
cd ~/node-backend-questlog

time curl -i \
  http://127.0.0.1:3000/demo/no-timeout/500
```

Expected:

```txt
HTTP/1.1 200 OK
```

The request finishes after approximately 500 milliseconds.

## Test an Unsafe Timeout

From repo root:

```bash
cd ~/node-backend-questlog

time curl -i \
  http://127.0.0.1:3000/demo/unsafe-timeout/3000
```

Expected after approximately one second:

```txt
HTTP/1.1 504 Gateway Timeout
```

```json
{
  "error": "OPERATION_TIMEOUT",
  "message": "The operation exceeded its deadline",
  "warning": "The underlying work was not cancelled",
  "requestId": "..."
}
```

Watch the API logs.

Approximately two seconds later, the API still logs:

```txt
Unsafe work finished after the timeout response
```

`Promise.race()` returned the timeout result, but it did not cancel the losing Promise.

## Test Real Cancellation

From repo root:

```bash
cd ~/node-backend-questlog

time curl -i \
  http://127.0.0.1:3000/demo/cancelled-timeout/3000
```

Expected after approximately one second:

```txt
HTTP/1.1 504 Gateway Timeout
```

```json
{
  "error": "OPERATION_TIMEOUT",
  "message": "The operation exceeded its deadline",
  "cancelled": true,
  "requestId": "..."
}
```

The unfinished timer Promise is cancelled through an `AbortSignal`.

## Test Completion Before the Deadline

From repo root:

```bash
cd ~/node-backend-questlog

time curl -i \
  http://127.0.0.1:3000/demo/cancelled-timeout/500
```

Expected:

```txt
HTTP/1.1 200 OK
```

The operation finishes before the one-second deadline.

## What to Notice

`Promise.race()` does not cancel losing Promises.

Returning a timeout response does not prove that the underlying work stopped.

`AbortSignal.timeout()` creates a signal that aborts automatically after a deadline.

The signal must be passed into the real asynchronous operation.

Cancellation is cooperative.

An API must support `AbortSignal` for cancellation to work.

An abort signal cannot interrupt arbitrary synchronous JavaScript that is blocking the event loop.

Timeouts protect request latency.

Cancellation also protects server resources.

## Takeaway

A timeout controls how long the caller waits.

Cancellation controls whether the unfinished work continues.

Production services usually need both.