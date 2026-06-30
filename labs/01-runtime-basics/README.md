# Lab 01 - Runtime Basics

## Goal

Understand what Node.js exposes about the running process.

## Run

```bash
npm run lab:runtime
```

## What to notice

This lab prints runtime information such as:

- Node.js version
- operating system platform
- CPU architecture
- current working directory
- command-line arguments
- environment variables
- memory usage

It also includes a small scheduling teaser with `Promise`, `setTimeout`, and `setImmediate`.

## Takeaway

Node.js is a JavaScript runtime that can access server-side process and operating system information through APIs like `process`.
EOF
