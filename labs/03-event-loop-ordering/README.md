# Lab 03 - Event Loop Ordering

## Goal

Understand the basic execution order of synchronous code, microtasks, timers, immediates, and I/O callbacks in Node.js.

## Run

```bash
node index.ts
```

## What to notice

Synchronous code runs first.

`process.nextTick()` runs before regular microtasks like `Promise.then()` and `queueMicrotask()`.

`setTimeout(..., 0)` and `setImmediate()` may appear in different order at the top level.

Inside an I/O callback, `setImmediate()` usually runs before `setTimeout(..., 0)`.

## Takeaway

The event loop is not random. Node.js has different queues and phases.

Synchronous code runs first, microtasks run soon after, and timers/immediates run through later event loop phases.
