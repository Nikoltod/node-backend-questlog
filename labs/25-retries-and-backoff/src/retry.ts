import { setTimeout as delay } from "node:timers/promises";

export type RetryContext = {
  attempt: number;
  nextAttempt: number;
  delayMs: number;
  error: unknown;
};

export type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  signal?: AbortSignal;

  shouldRetry(error: unknown): boolean;

  onRetry?(context: RetryContext): void;
};

function validateRetryOptions(
  options: RetryOptions,
): void {
  if (
    !Number.isInteger(options.maxAttempts) ||
    options.maxAttempts < 1
  ) {
    throw new Error(
      "maxAttempts must be an integer greater than zero",
    );
  }

  if (
    !Number.isFinite(options.baseDelayMs) ||
    options.baseDelayMs < 0
  ) {
    throw new Error(
      "baseDelayMs must be zero or greater",
    );
  }

  if (
    !Number.isFinite(options.maxDelayMs) ||
    options.maxDelayMs < options.baseDelayMs
  ) {
    throw new Error(
      "maxDelayMs must be greater than or equal to baseDelayMs",
    );
  }
}

function calculateBackoffDelay(
  failedAttempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponentialDelay = Math.min(
    maxDelayMs,
    baseDelayMs * 2 ** (failedAttempt - 1),
  );

  /*
   * Add up to 25% random jitter.
   */
  const jitterRange = Math.max(
    1,
    Math.floor(exponentialDelay * 0.25),
  );

  const jitterMs = Math.floor(
    Math.random() * jitterRange,
  );

  return Math.min(
    maxDelayMs,
    exponentialDelay + jitterMs,
  );
}

export async function retryWithBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  validateRetryOptions(options);

  for (
    let attempt = 1;
    attempt <= options.maxAttempts;
    attempt += 1
  ) {
    options.signal?.throwIfAborted();

    try {
      return await operation(attempt);
    } catch (error) {
      const attemptsExhausted =
        attempt >= options.maxAttempts;

      if (
        attemptsExhausted ||
        !options.shouldRetry(error)
      ) {
        throw error;
      }

      const delayMs = calculateBackoffDelay(
        attempt,
        options.baseDelayMs,
        options.maxDelayMs,
      );

      options.onRetry?.({
        attempt,
        nextAttempt: attempt + 1,
        delayMs,
        error,
      });

      await delay(delayMs, undefined, {
        signal: options.signal,
      });
    }
  }

  /*
   * The loop either returns or throws.
   */
  throw new Error(
    "Retry operation reached an impossible state",
  );
}