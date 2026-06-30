# Lab 10 - Fastify API

## Goal

Understand how Fastify wraps Node.js HTTP into a cleaner API framework with routing, request handling, response helpers, and logging.

## Run

```bash
npm run lab:fastify
```

## Try

```bash
curl http://localhost:3000/health
```

```bash
curl http://localhost:3000/quests
```

```bash
curl -X POST http://localhost:3000/quests \
  -H "content-type: application/json" \
  -d '{"title":"Learn Fastify routing"}'
```

```bash
curl -X PATCH http://localhost:3000/quests/1/complete
```

## What to notice

Fastify gives us route methods like `app.get`, `app.post`, and `app.patch`.

The `request` object contains incoming data like params and body.

The `reply` object controls status codes and responses.

Fastify handles JSON responses and logging for us.

## Takeaway

Fastify is an abstraction over Node.js HTTP.

It keeps the request/response model, but gives us cleaner routing, body parsing, JSON responses, logging, plugins, and production-friendly structure.