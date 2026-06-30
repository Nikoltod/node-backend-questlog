# Lab 09 - Raw HTTP Server

## Goal

Understand how Node.js handles HTTP requests and responses without using Express, Fastify, or NestJS.

## Run

```bash
npm run lab:http
```

## Try

```bash
curl http://localhost:3000/health
```

```bash
curl http://localhost:3000/runtime
```

```bash
curl -X POST http://localhost:3000/echo \
  -H "content-type: text/plain" \
  --data "hello from curl"
```

## What to notice

Node can create an HTTP server using the built-in `http` module.

The request object is a readable stream.

The response object is a writable stream.

Request body data arrives in chunks, which are Buffers.

## Takeaway

HTTP frameworks are built on top of the same basic idea: receive a request, inspect method/url/headers/body, then send a response.

Understanding raw HTTP makes Express, Fastify, and NestJS easier to reason about.