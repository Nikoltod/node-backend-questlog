import { setTimeout as delay } from "node:timers/promises";
export type WorkResult = {
    completedAfterMs: number,
};

/*
 * This operation supports cancellation because the
 * AbortSignal is passed into the Promise-based timer.
 */
export async function performSlowWork(
    milliseconds: number,
    signal?: AbortSignal,
): Promise<WorkResult> {
    if (signal) {
        await delay(milliseconds, undefined, {
            signal,
        });
    } else {
        await delay(milliseconds);
    }

    return {
        completedAfterMs: milliseconds,
    };
}