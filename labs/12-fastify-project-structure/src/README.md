# Lab 12 - Fastify Project Structure

## Goal

Understand how to split a Fastify API into smaller files so routes, schemas, types, app setup, and errors do not all live in one large file.

## Run

```bash
npm run lab:structure
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
  -d '{"title":"Separate routes and schemas","difficulty":"medium"}'
```

```bash
curl -X PATCH http://localhost:3000/quests/1/complete
```

## Structure

```txt
src/
  app.ts
  server.ts
  routes/
    quests.routes.ts
  schemas/
    quest.schemas.ts
  types/
    quest.types.ts
  errors/
    app-error.ts
```

## What to notice

`server.ts` only starts the server.

`app.ts` creates and configures the Fastify application.

Route logic lives in `routes`.

Validation schemas live in `schemas`.

TypeScript types live in `types`.

Application errors live in `errors`.

## Takeaway

Project structure is an architectural boundary.

Separating routes, schemas, types, and errors keeps the API easier to read, extend, test, and maintain.