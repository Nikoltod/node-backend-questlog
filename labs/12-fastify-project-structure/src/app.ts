import Fastify from "fastify";
import type { FastifyError } from "fastify";

// import { AppError } from "./errors/app-error.js";
import { registerQuestRoutes } from "./routes/quest.routes.js";
import { AppError } from "./errors/app-error.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
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

  app.register(registerQuestRoutes);

  return app;
}