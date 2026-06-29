# Lab 08 - Buffers and Binary Data

## Goal

Understand what Node.js Buffers are and why they matter when working with files, streams, network data, uploads, encoding, and binary data.

## Run

```bash
node index.ts
```

## What to notice

A Buffer stores raw bytes.

A string is human-readable text, but a Buffer is byte-level data.

The same text can have different string length and byte length, especially when it contains non-ASCII characters like emojis.

Buffers can be represented as UTF-8 text, hexadecimal, or base64.

Buffers can also be sliced into chunks, similar to how streams process data piece by piece.

## Takeaway

Buffers are Node.js containers for raw binary data.

Streams often emit Buffer chunks because files and network data are bytes before they are interpreted as text, JSON, images, or other formats.

Understanding Buffers makes streams, uploads, downloads, compression, encryption, and binary protocols much easier to reason about.