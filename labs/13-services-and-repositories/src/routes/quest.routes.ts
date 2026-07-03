import { FastifyInstance } from "fastify";
import { QuestService } from "../services/quest.service";
import { completeQuestSchema, createQuestSchema } from "labs/12-fastify-project-structure/src/schemas/quest.schemas";
import { CompleteQuestRouteTypes, CreateQuestRouteTypes } from "../types/quest.types";

export async function registerQuestRoutes(app: FastifyInstance, questService: QuestService) {
    app.get("/quests", async () => {
        return questService.listQuests();
    });

    app.post<CreateQuestRouteTypes>(
        "/quests",
        {
            schema: createQuestSchema
        },
        async (request, response) => {
            const quest = questService.createQuest(request.body);
            return response.code(201).send({
                quest,
            });
        }
    );

    app.patch<CompleteQuestRouteTypes>(
        "/quests/:id/complete",
        {
            schema: completeQuestSchema,
        },
        async (request, response) => {
            const questId = Number(request.params.id);
            const quest = questService.completeQuest(questId);

            return {
                ...quest
            };
        }
    );
}