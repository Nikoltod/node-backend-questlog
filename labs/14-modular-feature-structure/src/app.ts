import Fastify, { FastifyError } from "fastify"
import { QuestRepository } from "./modules/quests/quest.repository"
import { QuestService } from "./modules/quests/quest.service";
import { AppError } from "./errors/app-error";
import { registerQuestRoutes } from "./modules/quests/quest.routes";

export function buildApp() {
    const app = Fastify({
        logger: true,
    });

    const questRepository = new QuestRepository();
    const questService = new QuestService(questRepository);

    app.setErrorHandler((error: FastifyError | AppError, request, response) => {
        request.log.error(error);

        if(error instanceof AppError) {
            return response.code(error.statusCode).send({
                error: error.code,
                message: error.message,
            });
        }

        return response.code(500).send({
            error: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong",
        })
    });

    app.get("/health", async() => {
        return {
            status: "ok",
        }
    });

    app.register(async (registeredApp) => {
        await registerQuestRoutes(registeredApp, questService);
    });

    return app;
};


