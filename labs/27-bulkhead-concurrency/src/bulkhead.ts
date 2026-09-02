
export type WaitingOperation = {
    resolve: (release: () => void) => void;
}


export type BulkheadStatus = {
    active: number;
    queued: number;
    maxConcurrent: number;
    maxQueue: number;
}

export class Bulkhead {
    private active = 0;
    private readonly waitingQueue: WaitingOperation[] = [];

    constructor(
        private readonly maxConcurrent: number,
        private readonly maxQueue: number,
    ) {
        if (
            !Number.isFinite(maxConcurrent) ||
            maxConcurrent < 1
        ) {
            throw new Error(
                "maxConcurrent must be a finite number greater than zero",
            );
        }

        if (
            !Number.isInteger(maxQueue) ||
            maxQueue < 0
        ) {
            throw new Error(
                "maxQueue must be a non-negative integer",
            );
        }
    }

    async execute<T>(
        operation: () => Promise<T>,
    ): Promise<T> {
        const release = await this.acquire();

        try {
            return await operation();
        } finally {
            release();
        }
    }

    getStatus(): BulkheadStatus {
        return {
            active: this.active,
            queued: this.waitingQueue.length,
            maxConcurrent: this.maxConcurrent,
            maxQueue: this.maxQueue,
        }
    }



    private acquire(): Promise<() => void> {
        if (this.active < this.maxConcurrent) {
            this.active += 1;
            return Promise.resolve(() => {
                this.createReleaseFunction();
            });
        }

        if (
            this.waitingQueue.length >=
            this.maxQueue
        ) {
            return Promise.reject(
                new Error("Bulkhead queue is full"),
            );
        }

        return new Promise<() => void>((resolve) => {
            this.waitingQueue.push({
                resolve,
            });
        });
    }

    private createReleaseFunction(): () => void {

        let released = false;

        return () => {
            if (released) {
                return;
            }

            released = true;

            const nextOperation = 
                this.waitingQueue.shift();

            if (nextOperation) {
                nextOperation.resolve(
                    this.createReleaseFunction(),
                );

                return;

            }

            this.active -= 1;
        };
    }
}