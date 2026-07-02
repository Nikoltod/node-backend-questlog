# Lab 11 - Validation and Error Handling

## Goal

Understand how to validate API input and return consistent error responses in Fastify.

## Run

```bash
npm run lab:validation
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
  -d '{"title":"Learn validation","difficulty":"easy"}'
```

```bash
curl -X POST http://localhost:3000/quests \
  -H "content-type: application/json" \
  -d '{"title":"","difficulty":"easy"}'
```

```bash
curl -X POST http://localhost:3000/quests \
  -H "content-type: application/json" \
  -d '{"title":"Broken quest","difficulty":"impossible"}'
```

```bash
curl -X PATCH http://localhost:3000/quests/1/complete
```

```bash
curl -X PATCH http://localhost:3000/quests/abc/complete
```

```bash
curl http://localhost:3000/boom
```

## What to notice

Fastify can validate request bodies and route parameters using schemas.

Invalid input is rejected before the handler runs.

Custom application errors can return clean business-level responses.

Unexpected errors are logged internally but returned as safe generic responses.

## Takeaway

Validation protects the boundary of the application.

Error handling gives the API a consistent failure shape.

Route handlers should focus on business logic instead of repeating manual defensive checks everywhere.