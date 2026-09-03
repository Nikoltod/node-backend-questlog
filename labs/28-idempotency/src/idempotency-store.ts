export class IdempotencyConflictError extends Error {
    constructor() {
        super(
            "The idempotency key was already used for a different request",
        );

        this.name = "IdempotencyConflictError";
    }
}

type IdempotencyEntry<T> = {
    fingerprint: string;
    resultPromise: Promise<T>;
};

export type IdempotencyResult<T> = {
    result: T;
    replayed: boolean;
};

export class IdempotencyStore {
    private readonly entries =
        new Map<string, IdempotencyEntry<unknown>>();

    async execute<T>(
        key: string,
        fingerprint: string,
        operation: () => Promise<T>,
    ): Promise<IdempotencyResult<T>> {
        const existingEntry = this.entries.get(key);

        if (existingEntry) {
            if (
                existingEntry.fingerprint !==
                fingerprint
            ) {
                throw new IdempotencyConflictError();
            }

            return {
                result:
                    (await existingEntry.resultPromise) as T,
                replayed: true,
            };
        }

        const resultPromise = operation();

        this.entries.set(key, {
            fingerprint,
            resultPromise,
        });

        try {
            const result = await resultPromise;

            return {
                result,
                replayed: false,
            }
        } catch (error) {
            /*
            * A failed operation is removed.
            *
            * This allows the client to retry the same
            * operation later.
            */
            this.entries.delete(key);

            throw error;
        }
    }

    getSize(): number {
        return this.entries.size;
    }

    clear(): void {
        this.entries.clear();
    }
}