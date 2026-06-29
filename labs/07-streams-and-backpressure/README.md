# Lab 07 - Streams and Backpressure

## Goal

Understand how Node.js streams process large data piece by piece without loading the whole file into memory.

## Run

```bash
node index.ts
```

## What to notice

The lab generates a large input file.

Then it reads the file as a stream, transforms each chunk, and writes the result to another file.

The heartbeat continues while the stream is processing.

Memory usage should stay relatively stable because the file is not loaded all at once.

## Takeaway

Streams are used for chunk-based data flow.

Backpressure prevents fast producers from overwhelming slower consumers.

This makes streams useful for large files, uploads, downloads, logs, CSV processing, compression, and ETL-style pipelines.