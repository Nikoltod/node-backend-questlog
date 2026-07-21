import fastify from "fastify";

type Quest = {
    id: number;
    title: string;
    created: boolean;
    createdAt: string;
    completedAt: string | null;
};

const app = fastify({ 
    logger: true 
});

const quests: Quest[] = [];
let nextQuestId = 1;

app.get("/health", async () => {
    return { status: "ok" };
});

app.get("/quests", async () => {
    return {
        count: quests.length,
        quests,
    };
});

app.post<{ Body: {
    title?: string;
}; }>('/quests', async (request, reply) => {
    const title = request.body.title?.trim();
    
    if (!title) {
        return reply.status(400).send({
            status: "VALIDATION_ERROR",
            message: "Please provide a title for the quest.",
        })
    }

    const quest: Quest = {
        id: nextQuestId++,
        title,
        created: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
    };

    nextQuestId++;
    quests.push(quest);

    return reply.status(201).send({
        status: quest,
        message: "Quest created successfully.",
    });
});


app.patch<{
    Params: { 
        id: string;
 };
}>('/quests/:id/complete', async (request, reply) => {
        const questId = Number(request.params.id);

        if (Number.isNaN(questId)) {
            return reply.status(400).send({
                error: "VALIDATION_ERROR",
                message: "Quest ID must be a number.",
            });
        }

        const quest = quests.find((item) => item.id === questId);

        if (!quest) {
            return reply.status(404).send({
                error: "NOT_FOUND",
                message: `Quest was not found.`,
            });
        }

        quest.completedAt = new Date().toISOString();

        return {
            quest,
            message: "Quest marked as completed.",
        };
    });

async function main() {
    try {
        await app.listen({ port: 3000 });
        console.log("Server is running on http://localhost:3000");
    } catch (err) {
        console.error("Error starting Fastify server:", err);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error("Error in main function:", err);
    process.exit(1);
});