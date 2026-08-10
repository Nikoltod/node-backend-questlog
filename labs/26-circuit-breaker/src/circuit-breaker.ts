export type CircuitState =
  | "CLOSED"
  | "OPEN"
  | "HALF_OPEN";

export type CircuitBreakerOptions = {
  failureThreshold: number;
  resetTimeoutMs: number;

  onStateChange?: (
    previousState: CircuitState,
    nextState: CircuitState,
  ) => void;
};

export type CircuitBreakerStatus = {
  state: CircuitState;
  consecutiveFailures: number;
  failureThreshold: number;
  resetTimeoutMs: number;
  retryAfterMs: number;
  halfOpenAttemptInProgress: boolean;
};

export class CircuitOpenError extends Error {
  constructor(
    public readonly retryAfterMs: number,
  ) {
    super("Circuit breaker is open");
    this.name = "CircuitOpenError";
  }
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";

  private consecutiveFailures = 0;
  private openedAt: number | undefined;

  private halfOpenAttemptInProgress = false;

  constructor(
    private readonly options: CircuitBreakerOptions,
  ) {
    if (
      !Number.isInteger(options.failureThreshold) ||
      options.failureThreshold < 1
    ) {
      throw new Error(
        "failureThreshold must be an integer greater than zero",
      );
    }

    if (
      !Number.isFinite(options.resetTimeoutMs) ||
      options.resetTimeoutMs <= 0
    ) {
      throw new Error(
        "resetTimeoutMs must be greater than zero",
      );
    }
  }

  async execute<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    this.refreshState();

    if (this.state === "OPEN") {
      throw new CircuitOpenError(
        this.calculateRetryAfterMs(),
      );
    }

    const isHalfOpenAttempt =
      this.state === "HALF_OPEN";

    if (
      isHalfOpenAttempt &&
      this.halfOpenAttemptInProgress
    ) {
      throw new CircuitOpenError(
        this.options.resetTimeoutMs,
      );
    }

    if (isHalfOpenAttempt) {
      this.halfOpenAttemptInProgress = true;
    }

    try {
      const result = await operation();

      this.recordSuccess();

      return result;
    } catch (error) {
      this.recordFailure();

      throw error;
    } finally {
      if (isHalfOpenAttempt) {
        this.halfOpenAttemptInProgress = false;
      }
    }
  }

  getStatus(): CircuitBreakerStatus {
    this.refreshState();

    return {
      state: this.state,
      consecutiveFailures:
        this.consecutiveFailures,
      failureThreshold:
        this.options.failureThreshold,
      resetTimeoutMs:
        this.options.resetTimeoutMs,
      retryAfterMs:
        this.calculateRetryAfterMs(),
      halfOpenAttemptInProgress:
        this.halfOpenAttemptInProgress,
    };
  }

  reset(): void {
    this.consecutiveFailures = 0;
    this.openedAt = undefined;
    this.halfOpenAttemptInProgress = false;

    this.transitionTo("CLOSED");
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = undefined;

    if (this.state === "HALF_OPEN") {
      this.transitionTo("CLOSED");
    }
  }

  private recordFailure(): void {
    if (this.state === "HALF_OPEN") {
      this.openCircuit();
      return;
    }

    this.consecutiveFailures += 1;

    if (
      this.consecutiveFailures >=
      this.options.failureThreshold
    ) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    this.openedAt = Date.now();

    this.transitionTo("OPEN");
  }

  private refreshState(): void {
    if (
      this.state !== "OPEN" ||
      this.openedAt === undefined
    ) {
      return;
    }

    const elapsedMs =
      Date.now() - this.openedAt;

    if (
      elapsedMs >= this.options.resetTimeoutMs
    ) {
      this.transitionTo("HALF_OPEN");
    }
  }

  private calculateRetryAfterMs(): number {
    if (
      this.state !== "OPEN" ||
      this.openedAt === undefined
    ) {
      return 0;
    }

    const elapsedMs =
      Date.now() - this.openedAt;

    return Math.max(
      0,
      this.options.resetTimeoutMs - elapsedMs,
    );
  }

  private transitionTo(
    nextState: CircuitState,
  ): void {
    if (this.state === nextState) {
      return;
    }

    const previousState = this.state;

    this.state = nextState;

    this.options.onStateChange?.(
      previousState,
      nextState,
    );
  }
}