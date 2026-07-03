import { QuestRepository } from "./repositories/quest.repositories";
import Fastify, { FastifyError } from "fastify";
import { QuestService } from "./services/quest.service";
import { AppError } from "./errors/app-error";
import { registerQuestRoutes } from "./routes/quest.routes";

export function buildApp() {
    const app = Fastify({
        logger: true,
    });

    const questRepository = new QuestRepository();
    const questService = new QuestService(questRepository);
    
    app.setErrorHandler((error: FastifyError | AppError, request, response) => {
        request.log.error(error);

        if (error instanceof AppError) {

            return response.code(error.statusCode).send({
                error: error.code,
                message: error.message,
            });
        }

        if (error.validation) {
            return response.code(400).send({
                error: "VALIDATION_ERROR",
                message: "Request validation failed",
                details: error.validation,
            });
        }

        return response.code(500).send({
            error: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong",
        });
    });

    app.get("/health", async () => {
        return {
            status: "ok",
        };
    });

    app.register((async (registeredApp) => {
        await registerQuestRoutes(registeredApp, questService);
    }));

    return app;
}