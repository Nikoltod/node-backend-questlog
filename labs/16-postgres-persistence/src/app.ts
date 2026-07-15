import Fastify from "fastify";
import type { FastifyError } from "fastify";
import pg from "pg";

import { AppError } from "./shared/errors/app-error";
import { QuestRepository } from "./modules/quests/quest.repository";
import { QuestService } from "./modules/quests/quest.service";
import { registerQuestRoutes } from "./modules/quests/quest.routes";

const { Pool } = pg;

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  const pool = new Pool({
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: Number(process.env.POSTGRES_PORT ?? 5433),
    user: process.env.POSTGRES_USER ?? "questlog",
    password: process.env.POSTGRES_PASSWORD ?? "questlog",
    database: process.env.POSTGRES_DB ?? "questlog",
  });

  const questRepository = new QuestRepository(pool);
  await questRepository.initialize();

  const questService = new QuestService(questRepository);

  app.addHook("onClose", async () => {
    await pool.end();
  });

  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    request.log.error(error);

    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }

    if (error.validation) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.validation,
      });
    }

    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
    });
  });

  app.get("/health", async () => {
    return {
      status: "ok",
    };
  });

  app.register(async (registeredApp) => {
    await registerQuestRoutes(registeredApp, questService);
  });

  return app;
}