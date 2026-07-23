import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";

import { config } from "./config.js";
import { checkDatabaseReadiness } from "./database.js";

const METRIC_PREFIX = "node_backend_questlog_";

export const metricsRegistry = new Registry();

metricsRegistry.setDefaultLabels({
  service: config.serviceName,
  environment: config.nodeEnvironment,
});

collectDefaultMetrics({
  register: metricsRegistry,
  prefix: METRIC_PREFIX,
  eventLoopMonitoringPrecision:
    config.eventLoopMonitorResolutionMs,
});

const httpRequestsTotal = new Counter({
  name: `${METRIC_PREFIX}http_requests_total`,
  help: "Total number of completed HTTP requests",

  labelNames: [
    "method",
    "route",
    "status_code",
  ] as const,

  registers: [metricsRegistry],
});

const httpRequestDurationSeconds = new Histogram({
  name: `${METRIC_PREFIX}http_request_duration_seconds`,
  help: "HTTP request duration in seconds",

  labelNames: [
    "method",
    "route",
    "status_code",
  ] as const,

  buckets: [
    0.005,
    0.01,
    0.025,
    0.05,
    0.1,
    0.25,
    0.5,
    1,
    2.5,
    5,
    10,
    20,
  ],

  registers: [metricsRegistry],
});

const httpRequestsInProgress = new Gauge({
  name: `${METRIC_PREFIX}http_requests_in_progress`,
  help: "Number of HTTP requests currently being processed",
  registers: [metricsRegistry],
});

const httpRequestAbortsTotal = new Counter({
  name: `${METRIC_PREFIX}http_request_aborts_total`,
  help: "Total number of HTTP requests aborted by clients",

  labelNames: [
    "method",
    "route",
  ] as const,

  registers: [metricsRegistry],
});

const applicationShuttingDown = new Gauge({
  name: `${METRIC_PREFIX}application_shutting_down`,
  help: "Whether graceful shutdown is in progress",
  registers: [metricsRegistry],
});

new Gauge({
  name: `${METRIC_PREFIX}database_up`,
  help: "Whether PostgreSQL is reachable",

  async collect() {
    try {
      await checkDatabaseReadiness();
      this.set(1);
    } catch {
      this.set(0);
    }
  },

  registers: [metricsRegistry],
});

httpRequestsInProgress.set(0);
applicationShuttingDown.set(0);

const trackedRequests = new WeakSet<object>();

function getRouteLabel(
  request: FastifyRequest,
): string {
  return request.routeOptions.url ?? "unmatched";
}

export function isMetricsRequest(
  request: FastifyRequest,
): boolean {
  return (
    getRouteLabel(request) === "/metrics" ||
    request.url.startsWith("/metrics")
  );
}

export function recordRequestStarted(
  request: FastifyRequest,
): void {
  if (isMetricsRequest(request)) {
    return;
  }

  trackedRequests.add(request);
  httpRequestsInProgress.inc();
}

export function recordRequestCompleted(
  request: FastifyRequest,
  response: FastifyReply,
): void {
  if (!trackedRequests.delete(request)) {
    return;
  }

  httpRequestsInProgress.dec();

  const labels = {
    method: request.method,
    route: getRouteLabel(request),
    status_code: String(response.statusCode),
  };

  httpRequestsTotal.inc(labels);

  httpRequestDurationSeconds.observe(
    labels,
    response.elapsedTime / 1_000,
  );
}

export function recordRequestAborted(
  request: FastifyRequest,
): void {
  if (!trackedRequests.delete(request)) {
    return;
  }

  httpRequestsInProgress.dec();

  httpRequestAbortsTotal.inc({
    method: request.method,
    route: getRouteLabel(request),
  });
}

export function setApplicationShuttingDown(
  isShuttingDown: boolean,
): void {
  applicationShuttingDown.set(
    isShuttingDown ? 1 : 0,
  );
}

export function getMetricsContentType(): string {
  return metricsRegistry.contentType;
}

export async function renderMetrics(): Promise<string> {
  return metricsRegistry.metrics();
}