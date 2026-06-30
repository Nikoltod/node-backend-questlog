# Lab 02 - Sync vs Async

## Goal

Understand the difference between blocking synchronous work and non-blocking asynchronous work in Node.js.

## Run

```bash
npm run lab:sync
```

## What to notice

During the blocking sleep, the heartbeat stops.

During the async sleep, the heartbeat continues.

## Takeaway

Blocking work freezes the event loop.

Async work allows Node.js to keep handling other tasks while waiting.