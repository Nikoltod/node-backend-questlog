import { FastifyInstance } from "fastify";
import { QuestService } from "./quest.service";
import { CompleteQuestRouteTypes, CreateQuestRouteTypes } from "./quest.types";
import { completeQuestSchema, createQuestSchema } from "./quest.schemas";

export async function registerQuestRoutes(
    app: FastifyInstance,
    questService: QuestService
) {
    app.get("/quests", async() => {
        return questService.listQuests();
    })

    app.post<CreateQuestRouteTypes>(
        "/quests",
        {
            schema: createQuestSchema,
        },
        async (request, response) => {
            const quest = questService.createQuest(request.body);

            return response.code(201).send({
                quest,
            });
        }
    )

    app.patch<CompleteQuestRouteTypes>(
        "/quests/:id/complete",
        {
            schema: completeQuestSchema,
        },
        async (request, response) => {
            const questId = Number(request.params.id);
            const quest = questService.completeQuest(questId);

            return {
                quest,
            };
        }
    )
}