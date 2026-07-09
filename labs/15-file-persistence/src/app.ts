import Fastify from "fastify";
import { FastifyError } from "fastify";
import { QuestRepository } from "./modules/quests/quest.repository";
import { AppError } from "./shared/errors/app-error";
import { registerQuestRoutes } from "./modules/quests/quest.routes";
import { QuestService } from "./modules/quests/quest.service";



export function buildApp() {
    const app = Fastify({
        logger: true,
    });

    const filePathString = "labs/15-file-persistence/data/quests.json";

    const questRepository = new QuestRepository(filePathString);
    const questService = new QuestService(questRepository);

    app.setErrorHandler((error: FastifyError | AppError, request, response) => {
        request.log.error(error);

        if (error instanceof AppError) {
            return response.code(error.statusCode).send({
                code: error.code,
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


    app.register(async (registeredApp) => {
        await registerQuestRoutes(registeredApp, questService);
    });

    return app;
}