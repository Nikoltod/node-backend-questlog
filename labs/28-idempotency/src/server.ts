import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import Fastify from "fastify";

import {
    IdempotencyConflictError,
    IdempotencyStore,
} from "./idempotency-store";

const PORT = 3000;

const app = Fastify({
    logger: true,
});

const idempotencyStore =
    new IdempotencyStore();

let nextOrderId = 1;
let ordersCreated = 0;

type CreateOrderBody = {
    product: string;
    quantity: number;
};

type Order = {
    id: number;
    product: string;
    quantity: number;
    createdAt: string;
};

function createFingerprint(
    body: CreateOrderBody,
): string {
    return createHash("sha256")
        .update(JSON.stringify(body))
        .digest("hex");
}

async function createOrder(
    body: CreateOrderBody,
): Promise<Order> {
    /*
     * Simulate an async database/payment operation.
     *
     * delay() does not block the event loop.
     */
    await delay(1_000);

    const order: Order = {
        id: nextOrderId,
        product: body.product,
        quantity: body.quantity,
        createdAt: new Date().toISOString(),
    };

    nextOrderId += 1;
    ordersCreated += 1;

    app.log.info(
        {
            orderId: order.id,
            ordersCreated,
        },
        "Order actually created",
    );

    return order;
}

app.get("/health", async () => {
    return {
        status: "ok",
    };
});

app.get("/stats", async () => {
    return {
        ordersCreated,
        idempotencyEntries:
            idempotencyStore.getSize(),
    };
});

app.post(
    "/reset",
    async () => {
        idempotencyStore.clear();

        nextOrderId = 1;
        ordersCreated = 0;

        return {
            message: "Demo state reset",
        };
    },
);

app.post<{
    Body: CreateOrderBody;
}>(
    "/orders",
    async (request, reply) => {
        const idempotencyKey =
            request.headers["idempotency-key"];

        if (
            typeof idempotencyKey !== "string" ||
            idempotencyKey.length === 0
        ) {
            return reply.code(400).send({
                error: "IDEMPOTENCY_KEY_REQUIRED",
                message:
                    "Send an Idempotency-Key header",
                requestId: request.id,
            });
        }

        const {
            product,
            quantity,
        } = request.body;

        if (
            typeof product !== "string" ||
            product.length === 0 ||
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            return reply.code(400).send({
                error: "INVALID_ORDER",
                message:
                    "product must be a non-empty string and quantity must be a positive integer",
                requestId: request.id,
            });
        }

        const fingerprint =
            createFingerprint(request.body);

        request.log.info(
            {
                idempotencyKey,
                fingerprint,
            },
            "Processing idempotent order request",
        );

        try {
            const {
                result,
                replayed,
            } = await idempotencyStore.execute(
                idempotencyKey,
                fingerprint,
                () => createOrder(request.body),
            );

            request.log.info(
                {
                    idempotencyKey,
                    orderId: result.id,
                    replayed,
                },
                replayed
                    ? "Returning previous order result"
                    : "Order created successfully",
            );

            reply.header(
                "idempotency-replayed",
                String(replayed),
            );

            return reply
                .code(replayed ? 200 : 201)
                .send({
                    order: result,
                    replayed,
                    requestId: request.id,
                });
        } catch (error) {
            if (
                error instanceof
                IdempotencyConflictError
            ) {
                request.log.warn(
                    {
                        idempotencyKey,
                    },
                    "Idempotency key reused for different request",
                );

                return reply.code(409).send({
                    error:
                        "IDEMPOTENCY_KEY_CONFLICT",

                    message:
                        "This idempotency key was already used for a different request",

                    requestId: request.id,
                });
            }

            throw error;
        }
    },
);

async function startServer(): Promise<void> {
    try {
        await app.listen({
            host: "0.0.0.0",
            port: PORT,
        });

        app.log.info(
            {
                pid: process.pid,
                port: PORT,
            },
            "Idempotency demonstration started",
        );
    } catch (error) {
        app.log.error(
            {
                err: error,
            },
            "Failed to start idempotency demonstration",
        );

        process.exitCode = 1;
    }
}

void startServer();