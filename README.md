# Node Backend Questlog

A hands-on learning repository for understanding Node.js backend development deeply—not just using Node.js to serve a frontend.

The repository contains focused TypeScript experiments covering the Node.js runtime, asynchronous execution, the event loop, worker threads, streams, HTTP APIs, application architecture, persistence, databases, testing, queues, caching, deployment, and production patterns.

Each lab is intentionally small and focuses on one core backend concept.

## Tech Stack

- Node.js
- TypeScript
- tsx
- Fastify
- PostgreSQL
- Docker / Podman

## Labs

### Node.js Runtime

- [Lab 01 – Runtime Basics](./01-runtime-basics)
- [Lab 02 – Sync vs Async](./02-sync-vs-async)
- [Lab 03 – Event Loop Ordering](./03-event-loop-ordering)
- [Lab 04 – Partitioning CPU Work](./04-partitioning-cpu-work)
- [Lab 05 – Offloading Work with Worker Threads](./05-offloading-worker-threads)
- [Lab 06 – The libuv Thread Pool](./06-libuv-threadpool)
- [Lab 07 – Streams and Backpressure](./07-streams-and-backpressure)
- [Lab 08 – Buffers and Binary Data](./08-buffers-and-binary-data)

### HTTP and Fastify

- [Lab 09 – Raw HTTP Server](./09-raw-http-server)
- [Lab 10 – Fastify API](./10-fastify-api)
- [Lab 11 – Validation and Errors](./11-validation-and-errors)
- [Lab 12 – Fastify Project Structure](./12-fastify-project-structure)

### Backend Architecture

- [Lab 13 – Services and Repositories](./13-services-and-repositories)
- [Lab 14 – Modular Feature Structure](./14-modular-feature-structure)

### Persistence and Databases

- [Lab 15 – File Persistence](./15-file-persistence)
- [Lab 16 – PostgreSQL with Docker](./16-postgresql-with-docker)
- [Lab 17 – Database Migrations](./17-database-migrations)
- [Lab 18 – Environment Configuration](./18-environment-configuration)

## What Each Lab Contains

Each lab includes:

1. A focused lesson
2. A simple explanation of the concept
3. Its meaning in a real backend application
4. Runnable commands and code
5. A dedicated `README.md`
6. A Git commit representing the completed lesson

## Running a Lab

Install the dependencies from the repository root:

```bash
npm install
```

Check the available scripts:

```bash
npm run
```

Run a lab using its corresponding npm script:

```bash
npm run <lab-script>
```

Some database labs require a running PostgreSQL container.

## Repository Structure

```text
node-backend-questlog/
├── 01-runtime-basics/
├── 02-sync-vs-async/
├── ...
├── 17-database-migrations/
├── 18-environment-configuration/
├── package.json
├── tsconfig.json
└── README.md
```

## Goal

The goal is to build a strong mental model of how Node.js backend systems actually work—from runtime fundamentals to maintainable, database-backed, production-ready applications.

This is a learning repository, so the code favors clarity and experimentation over abstraction for its own sake.