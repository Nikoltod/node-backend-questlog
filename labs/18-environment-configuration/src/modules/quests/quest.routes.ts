import type { FastifyInstance } from "fastify";

import {
  completeQuestSchema,
  createQuestSchema,
} from "./quest.schemas";
import type {
  CompleteQuestRouteTypes,
  CreateQuestRouteTypes,
} from "./quest.types.ts";
import type { QuestService } from "./quest.service.ts";

export async function registerQuestRoutes(
  app: FastifyInstance,
  questService: QuestService
) {
  app.get("/quests", async () => {
    return questService.listQuests();
  });

  app.post<CreateQuestRouteTypes>(
    "/quests",
    {
      schema: createQuestSchema,
    },
    async (request, reply) => {
      const quest = await questService.createQuest(request.body);

      return reply.code(201).send({
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
      const questId = Number(request.params.id);
      const quest = await questService.completeQuest(questId);

      return {
        quest,
      };
    }
  );
}