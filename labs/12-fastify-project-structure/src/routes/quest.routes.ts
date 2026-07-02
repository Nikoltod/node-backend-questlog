import { FastifyInstance } from "fastify/types/instance";
import { CompleteQuestRouteTypes, Quest, QuestRouteTypes } from "../types/types";
import { completeQuestSchema, createQuestSchema } from "../schemas/quest.schemas";
import { NotFoundError } from "../errors/app-error";

const quests: Quest[] = [];
let nextQuestId = 1;

export async function registerQuestRoutes(app: FastifyInstance) {
    app.get("/quests", async () => {
        return {
            count: quests.length,
            quests
        };
    });

    app.post<QuestRouteTypes>(
        "/quests",
        {
            schema: createQuestSchema
        },
        async (request, response) => {
            const quest: Quest = {
                id: nextQuestId,
                title: request.body.title.trim(),
                difficulty: request.body.difficulty,
                completed: false,
                createdAt: new Date().toISOString(),
                completedAt: null
            };

            nextQuestId++;
            quests.push(quest);

            response.code(201).send({
                quest,
            });
        }
    );

    app.patch<CompleteQuestRouteTypes>(
        "/quests/:id/complete",
        {
            schema: completeQuestSchema,
        },
        async (request) => {
            const questId = parseInt(request.params.id, 10);
            const quest = quests.find((q) => q.id === questId);

            if (!quest) {
                throw new NotFoundError(`Quest was not found`);
            }

            quest.completed = true;
            quest.completedAt = new Date().toISOString();

            return {
                quest,
            };
        }
    );
};