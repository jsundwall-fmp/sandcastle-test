import { Counter, Histogram } from "prom-client";

export interface PollingMetrics {
  observeRunDuration(seconds: number): void;
  recordFailure(): void;
}

const pollingRuntimeHistogram = new Histogram({
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60],
  help: "Runtime of the server-owned polling task in seconds.",
  name: "polling_task_runtime_seconds",
});

const pollingFailureCounter = new Counter({
  help: "Number of failed runs for the server-owned polling task.",
  name: "polling_task_failures_total",
});

export const pollingMetrics: PollingMetrics = {
  observeRunDuration(seconds: number) {
    pollingRuntimeHistogram.observe(seconds);
  },
  recordFailure() {
    pollingFailureCounter.inc();
  },
};
