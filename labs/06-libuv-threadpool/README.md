# Lab 06 - libuv Threadpool

## Goal

Understand that some asynchronous Node.js APIs use libuv's internal threadpool to perform expensive work without blocking the main JavaScript thread.

## Run

```bash
node index.ts
```

Optional:

```bash
UV_THREADPOOL_SIZE=2 npm run lab:threadpool
```

## What to notice

During the synchronous crypto tasks, the heartbeat stops.

During the asynchronous crypto tasks, the heartbeat continues.

The async crypto work is handled by libuv's internal threadpool, while the main JavaScript thread remains responsive.

If you run with `UV_THREADPOOL_SIZE=2`, you may notice async tasks finishing in smaller groups because fewer libuv workers are available.

## Takeaway

The libuv threadpool is not the same as `worker_threads`.

`worker_threads` allow you to run your own JavaScript code on separate threads.

The libuv threadpool is used internally by Node.js for selected native operations like crypto, filesystem, zlib, and DNS work.

Async APIs can keep the event loop responsive, but the completion callback still returns to the main JavaScript thread.
