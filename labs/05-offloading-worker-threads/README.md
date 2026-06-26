# Lab 05 - Offloading with Worker Threads

## Goal

Understand how to move CPU-heavy work away from the main JavaScript thread using Node.js worker threads.

## Run

```bash
node index.ts
```

## What to notice

During the blocking CPU work, the heartbeat stops.

During the worker thread version, the heartbeat continues while the worker processes the CPU-heavy task.

The worker can also send progress messages back to the main thread.

## Takeaway

Offloading means moving heavy work away from the main JavaScript thread.

Worker threads allow CPU-heavy JavaScript work to run in parallel with the main event loop.

This keeps the main thread responsive while another thread performs expensive computation.
