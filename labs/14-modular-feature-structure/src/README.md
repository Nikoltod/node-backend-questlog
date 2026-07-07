# Lab 14 - Modular Feature Structure

## Goal

Understand how to organize a Node.js/Fastify backend by feature/module instead of only by technical layer.

## Run

```bash
npm run lab:modules
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
  -d '{"title":"Learn modular structure","difficulty":"medium"}'
```

```bash
curl -X PATCH http://localhost:3000/quests/1/complete
```

## Structure

```txt
src/
  app.ts
  server.ts
  shared/
    errors/
      app-error.ts
  modules/
    quests/
      quest.routes.ts
      quest.schemas.ts
      quest.types.ts
      quest.repository.ts
      quest.service.ts
```

## What to notice

The `quests` feature keeps its routes, schemas, types, service, and repository together.

Shared code, like application errors, lives outside the feature.

The app still keeps responsibilities separated, but the files are grouped by business capability.

## Takeaway

Layer-based structure groups files by technical role.

Feature-based structure groups files by business capability.

For larger applications, feature-based structure often reduces file-hopping and makes ownership clearer.