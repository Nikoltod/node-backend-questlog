# Lab 15 - File Persistence

## Goal

Understand how to replace in-memory storage with file-based persistence while keeping routes and services mostly unchanged.

## Run

```bash
npm run lab:file-persistence
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
  -d '{"title":"Persist quests to a file","difficulty":"medium"}'
```

```bash
curl -X PATCH http://localhost:3000/quests/1/complete
```

Then stop and restart the server.

Run:

```bash
curl http://localhost:3000/quests
```

The quest should still exist because it was saved to:

```txt
labs/15-file-persistence/data/quests.json
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
data/
  quests.json
```

## What to notice

The route layer still only talks to the service.

The service still only talks to the repository.

Only the repository knows that data is stored in a JSON file.

The persistence mechanism changed, but the route layer did not need to know the details.

## Takeaway

Repositories hide persistence details.

File storage is not a replacement for a real database in serious multi-user systems, but it teaches the same architectural idea: the rest of the application should not care where data is stored.