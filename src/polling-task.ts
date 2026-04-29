import type { PollingMetrics } from "./polling-metrics.js";
import type { ProbeState } from "./probes.js";

type TimerHandle = ReturnType<typeof setInterval>;

interface Timers {
  clearInterval(handle: TimerHandle): void;
  setInterval(callback: () => void, timeout: number): TimerHandle;
}

interface Logger {
  error(message: string, ...optionalParams: unknown[]): void;
  log(message: string, ...optionalParams: unknown[]): void;
}

export interface PollingTaskOptions {
  intervalMs: number;
  logger?: Logger;
  metrics: PollingMetrics;
  onFatalError?: (error: unknown) => void;
  probeState: ProbeState;
  run?: () => void | Promise<void>;
  timers?: Timers;
}

export interface PollingTask {
  start(): void;
  stop(): Promise<void>;
}

export function createPollingTask(options: PollingTaskOptions): PollingTask {
  const logger = options.logger ?? console;
  const metrics = options.metrics;
  const probeState = options.probeState;
  const timers = options.timers ?? {
    clearInterval,
    setInterval,
  };
  const run = options.run ?? (() => {
    logger.log("Polling task run");
  });
  const onFatalError = options.onFatalError ?? (() => {});

  let intervalHandle: TimerHandle | undefined;
  let started = false;
  let stopping = false;
  let fatalTriggered = false;
  let initialRunStarted = false;
  let activeRuns = 0;
  let stopPromise: Promise<void> | undefined;
  let resolveStopPromise: (() => void) | undefined;

  function clearScheduledInterval() {
    if (intervalHandle === undefined) {
      return;
    }

    timers.clearInterval(intervalHandle);
    intervalHandle = undefined;
  }

  function resolveStopIfIdle() {
    if (!stopping || activeRuns !== 0 || resolveStopPromise === undefined) {
      return;
    }

    resolveStopPromise();
    resolveStopPromise = undefined;
    stopPromise = undefined;
  }

  async function executeRun() {
    if (fatalTriggered) {
      return;
    }

    const isInitialRun = !initialRunStarted;
    initialRunStarted = true;
    activeRuns += 1;
    const startedAt = Date.now();

    try {
      await run();

      if (isInitialRun && !fatalTriggered) {
        probeState.markInitialRunComplete();
      }
    } catch (error) {
      metrics.recordFailure();
      logger.error("Polling task run failed", error);

      if (!probeState.hasCompletedInitialRun() && !fatalTriggered) {
        fatalTriggered = true;
        stopping = true;
        clearScheduledInterval();

        try {
          onFatalError(error);
        } catch (fatalError) {
          logger.error("Polling task fatal handler failed", fatalError);
        }
      }
    } finally {
      metrics.observeRunDuration((Date.now() - startedAt) / 1000);
      activeRuns -= 1;
      resolveStopIfIdle();
    }
  }

  return {
    start() {
      if (started || stopping) {
        return;
      }

      started = true;
      intervalHandle = timers.setInterval(() => {
        void executeRun();
      }, options.intervalMs);
      void executeRun();
    },
    stop() {
      stopping = true;
      clearScheduledInterval();

      if (activeRuns === 0) {
        return Promise.resolve();
      }

      if (stopPromise === undefined) {
        stopPromise = new Promise<void>((resolve) => {
          resolveStopPromise = resolve;
        });
      }

      return stopPromise;
    },
  };
}
