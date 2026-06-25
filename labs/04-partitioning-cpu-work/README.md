# Lab 04 - Partitioning CPU Work

## Goal

Understand how CPU-heavy JavaScript work can block the Node.js event loop, and how partitioning can keep the event loop responsive.

## Run

```bash
npm run lab:partitioning
```

## What to notice

During the blocking CPU work, the heartbeat stops.

During the partitioned CPU work, the heartbeat continues.

The partitioned version still runs on the main JavaScript thread, but it splits the work into smaller chunks and yields back to the event loop between chunks.

## Takeaway

Partitioning does not move work to another thread.

Partitioning means breaking CPU-heavy work into smaller pieces so Node.js can handle other callbacks between chunks.

This keeps the app more responsive, but it does not make the CPU work truly parallel.