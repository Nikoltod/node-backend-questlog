# Lab 13 - Services and Repositories

## Goal

Understand how to separate HTTP routing, business logic, and data access in a Fastify application.

## Run

```bash
npm run lab:layers
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
  -d '{"title":"Separate business logic","difficulty":"hard"}'
```

```bash
curl -X PATCH http://localhost:3000/quests/1/complete
```

## Structure

```txt
src/
  app.ts
  server.ts
  errors/
    app-error.ts
  repositories/
    quest.repository.ts
  routes/
    quests.routes.ts
  schemas/
    quest.schemas.ts
  services/
    quest.service.ts
  types/
    quest.types.ts
```

## What to notice

Routes handle HTTP concerns.

Services handle business rules.

Repositories handle data access.

The route handler no longer owns quest creation or completion logic directly.

## Takeaway

Routes adapt HTTP to the application.

Services contain business behavior.

Repositories hide persistence details.

This structure makes it easier to swap in a real database later without rewriting route handlers.