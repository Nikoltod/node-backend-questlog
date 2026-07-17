import Fastify from "fastify";
import type { FastifyError } from "fastify";

import { createPool } from "./db/database.ts";
import { AppError } from "./shared/errors/app-error.ts";
import { QuestRepository } from "./modules/quests/quest.repository.ts";
import { QuestService } from "./modules/quests/quest.service.ts";
import { registerQuestRoutes } from "./modules/quests/quest.routes.ts";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  const pool = createPool();

  const questRepository = new QuestRepository(pool);
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