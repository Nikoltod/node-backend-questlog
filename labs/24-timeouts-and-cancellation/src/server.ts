import { setTimeout as delay } from "node:timers/promises";
import Fastify, {
    type FastifyReply,
} from "fastify";

import {
    performSlowWork,
    type WorkResult,
} from "./work.js";

const app = Fastify({
    logger: true,
});


const OPERATION_TIMEOUT_MS = 1_000;

class OperationTimeoutError extends Error {
    constructor() {
        super("Operation exceeded its deadline");
        this.name = "OperationTimeoutError";
    }
}

type DurationParams = {
    milliseconds: string;
};

function parseDuration(
    rawValue: string,
    response: FastifyReply,
): number | null {
    const milliseconds = Number(rawValue);

    if (
        !Number.isInteger(milliseconds) ||
        milliseconds < 0 ||
        milliseconds > 10_000
    ) {
        void response.code(400).send({
            error: "INVALID_DURATION",
            message:
                "milliseconds must be an integer between 0 and 10000",
        });

        return null;
    }

    return milliseconds;
}

async function rejectAfter(
    milliseconds: number,
): Promise<never> {
    await delay(milliseconds);

    throw new OperationTimeoutError();
}

app.get("/health", async () => {
    return {
        status: "ok",
    };
});

/*
 * No timeout.
 *
 * The client waits until the operation finishes.
 */
app.get<{
    Params: DurationParams;
}>(
    "/demo/no-timeout/:milliseconds",
    async (request, response) => {
        const milliseconds = parseDuration(
            request.params.milliseconds,
            response,
        );

        if (milliseconds == null) {
            return;
        }

        const result = await performSlowWork(milliseconds);

        return {
            mode: "no-timeout",
            result,
            requestId: request.id,
        };
    },
);

/*
 * Unsafe timeout.
 *
 * Promise.race returns after one second, but the slow
 * operation continues running in the background.
 */
app.get<{
    Params: DurationParams;
}>(
    "/demo/unsafe-timeout/:milliseconds",
    async (request, reply) => {
        const milliseconds = parseDuration(
            request.params.milliseconds,
            reply,
        );

        if (milliseconds === null) {
            return;
        }

        const workPromise: Promise<WorkResult> =
            performSlowWork(milliseconds).then((result) => {
                request.log.warn(
                    {
                        operationDurationMs: milliseconds,
                    },
                    "Unsafe work finished after the timeout response",
                );

                return result;
            });

        try {
            const result = await Promise.race([
                workPromise,
                rejectAfter(OPERATION_TIMEOUT_MS),
            ]);

            return {
                mode: "unsafe-timeout",
                result,
                requestId: request.id,
            };
        } catch (error) {
            if (error instanceof OperationTimeoutError) {
                request.log.warn(
                    {
                        timeoutMs: OPERATION_TIMEOUT_MS,
                        operationDurationMs: milliseconds,
                    },
                    "Request timed out but work is still running",
                );

                return reply.code(504).send({
                    error: "OPERATION_TIMEOUT",
                    message:
                        "The operation exceeded its deadline",
                    warning:
                        "The underlying work was not cancelled",
                    requestId: request.id,
                });
            }

            throw error;
        }
    },
);

/*
 * Real cancellation.
 *
 * AbortSignal.timeout automatically aborts after one
 * second. The signal is passed into the operation.
 */
app.get<{
    Params: DurationParams;
}>(
    "/demo/cancelled-timeout/:milliseconds",
    async (request, reply) => {
        const milliseconds = parseDuration(
            request.params.milliseconds,
            reply,
        );

        if (milliseconds === null) {
            return;
        }

        const signal = AbortSignal.timeout(
            OPERATION_TIMEOUT_MS,
        );

        try {
            const result = await performSlowWork(
                milliseconds,
                signal,
            );

            return {
                mode: "cancelled-timeout",
                result,
                requestId: request.id,
            };
        } catch (error) {
            if (signal.aborted) {
                request.log.warn(
                    {
                        timeoutMs: OPERATION_TIMEOUT_MS,
                        operationDurationMs: milliseconds,
                        abortReason: signal.reason,
                    },
                    "Operation was cancelled after exceeding its deadline",
                );

                return reply.code(504).send({
                    error: "OPERATION_TIMEOUT",
                    message:
                        "The operation exceeded its deadline",
                    cancelled: true,
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
            port: 3000,
        });

        app.log.info(
            {
                pid: process.pid,
                port: 3000,
                operationTimeoutMs: OPERATION_TIMEOUT_MS,
            },
            "Timeout demonstration started",
        );
    } catch (error) {
        app.log.error(
            {
                err: error,
            },
            "Failed to start timeout demonstration",
        );

        process.exitCode = 1;
    }
}

void startServer();