import Fastify from "fastify";
import type { FastifyError } from "fastify";

const app = Fastify({
    logger: true
})

class AppError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly statusCode: number){
            super(message);
        }
}
    
enum DiffType {
    Easy = "easy",
    Medium = "medium",
    Hard = "hard",
}

type Quest = {
    id: number;
    title: string;
    difficulty: DiffType;
    completed: boolean;
    createdAt: string;
    completedAt?: string | null;
};

type CompleteQuestParams = {
    id: string;
};

type CreateQuestBody = {
    title: string;
    difficulty: DiffType;
};

class NotFoundError extends AppError {
    constructor(message: string) {
        super("NOT_FOUND", message, 404);
    }
};

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
            message: "Invalid request data.",
            details: error.validation,
        });
    }

    return response.status(500).send({
        error: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong on the server.",
    });
});

const quests: Quest[] = [];
let nextQuestId = 1;
app.get("/health", async () => {
    return {
        status: "ok",
    }
});

app.get("/quests", async () => {
    return {
        count: quests.length,
        quests,
    }
});

app.post<{
    Body: CreateQuestBody;
}>(
    "/quests",
    {
        schema: {
            body: {
                type: "object",
                required: ["title", "difficulty"],
                properties: {
                    title: {
                        type: "string",
                        minLength: 1,
                        maxLength: 120,
                    },
                    difficulty: {
                        type: "string",
                        enum: ["easy", "medium", "hard"],
                    },
                },
            },
        },
    },
    async (request, response) => {
        const quest: Quest = {
            id: nextQuestId,
            title: request.body.title.trim(),
            difficulty: request.body.difficulty,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null,
        };

        nextQuestId++;

        quests.push(quest);

        return response.code(201).send({
            status: quest,
            message: "Quest created successfully.",
        });
    
    }
);

app.patch<{
    Params: CompleteQuestParams;
}>(
    "/quests/:id/complete",
    {
        schema: {
            params: {
                type: "object",
                required: ["id"],
                properties: {
                    id: {
                        type: "string",
                        pattern: "^[0-9]+$"
                    },
                },
            },
        },
    },
    async (request) => {
        const questId = Number(request.params.id);

        const quest = quests.find((item) => item.id === questId);

        if (!quest) {
            throw new NotFoundError("Quest not found");
        }

        quest.completed = true;
        quest.completedAt = new Date().toISOString();

        return {
            quest,
        }
    },
);

app.get("/boom", async () => {
    throw new Error("Unexpected crash example!");
});

async function main() {
    await app.listen({ 
        port: 3000,
        host: "0.0.0.0"
    })
}

main().catch(err => {
    app.log.error(err);
    process.exit(1);
});