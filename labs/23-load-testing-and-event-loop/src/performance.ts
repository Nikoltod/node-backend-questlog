import {
  monitorEventLoopDelay,
  performance,
} from "node:perf_hooks";
import { Gauge } from "prom-client";

import { config } from "./config.js";
import { metricsRegistry } from "./metrics.js";

const METRIC_PREFIX = "node_backend_questlog_";
const NANOSECONDS_PER_SECOND = 1_000_000_000;

const eventLoopDelayMonitor = monitorEventLoopDelay({
  resolution: config.eventLoopMonitorResolutionMs,
});

let performanceMonitoringStarted = false;

let previousEventLoopUtilization =
  performance.eventLoopUtilization();

const eventLoopDelayMeanSeconds = new Gauge({
  name: `${METRIC_PREFIX}event_loop_delay_mean_seconds`,
  help: "Mean event-loop delay since monitoring started",
  registers: [metricsRegistry],
});

const eventLoopDelayMaxSeconds = new Gauge({
  name: `${METRIC_PREFIX}event_loop_delay_max_seconds`,
  help: "Maximum event-loop delay since monitoring started",
  registers: [metricsRegistry],
});

const eventLoopDelayP99Seconds = new Gauge({
  name: `${METRIC_PREFIX}event_loop_delay_p99_seconds`,
  help: "99th percentile event-loop delay since monitoring started",
  registers: [metricsRegistry],
});

const eventLoopUtilizationRatio = new Gauge({
  name: `${METRIC_PREFIX}event_loop_utilization_ratio`,
  help: "Event-loop utilization since the previous metrics render",
  registers: [metricsRegistry],
});

function nanosecondsToSeconds(
  nanoseconds: number,
): number {
  if (!Number.isFinite(nanoseconds)) {
    return 0;
  }

  return nanoseconds / NANOSECONDS_PER_SECOND;
}

export function startPerformanceMonitoring(): void {
  if (performanceMonitoringStarted) {
    return;
  }

  previousEventLoopUtilization =
    performance.eventLoopUtilization();

  eventLoopDelayMonitor.enable();
  performanceMonitoringStarted = true;
}

export function refreshPerformanceMetrics(): void {
  if (!performanceMonitoringStarted) {
    return;
  }

  eventLoopDelayMeanSeconds.set(
    nanosecondsToSeconds(
      eventLoopDelayMonitor.mean,
    ),
  );

  eventLoopDelayMaxSeconds.set(
    nanosecondsToSeconds(
      eventLoopDelayMonitor.max,
    ),
  );

  eventLoopDelayP99Seconds.set(
    nanosecondsToSeconds(
      eventLoopDelayMonitor.percentile(99),
    ),
  );

  const currentEventLoopUtilization =
    performance.eventLoopUtilization();

  const utilizationSincePreviousRender =
    performance.eventLoopUtilization(
      currentEventLoopUtilization,
      previousEventLoopUtilization,
    );

  previousEventLoopUtilization =
    currentEventLoopUtilization;

  eventLoopUtilizationRatio.set(
    utilizationSincePreviousRender.utilization,
  );
}

export function stopPerformanceMonitoring(): void {
  if (!performanceMonitoringStarted) {
    return;
  }

  eventLoopDelayMonitor.disable();
  performanceMonitoringStarted = false;
}

/*
 * Deliberately blocks the main JavaScript thread.
 *
 * This exists only to demonstrate bad CPU-bound behavior.
 */
export function blockEventLoop(
  milliseconds: number,
): void {
  const startedAt = performance.now();

  while (
    performance.now() - startedAt < milliseconds
  ) {
    // Intentionally keep JavaScript busy.
  }
}