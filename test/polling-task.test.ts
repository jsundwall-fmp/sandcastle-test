import assert from "node:assert/strict";
import test from "node:test";

import { createPollingTask } from "../src/polling-task.js";
import { createProbeState } from "../src/probes.js";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;

  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test("polling task runs immediately, schedules the interval, and waits for in-flight work on stop", async () => {
  const probeState = createProbeState();
  const deferred = createDeferred<void>();
  let intervalCallback: (() => void) | undefined;
  let intervalMs = 0;
  let clearIntervalCalls = 0;
  let runCount = 0;

  const task = createPollingTask({
    intervalMs: 5 * 60_000,
    logger: {
      error: () => {},
      log: () => {},
    },
    metrics: {
      observeRunDuration: () => {},
      recordFailure: () => {},
    },
    onFatalError: () => {
      throw new Error("unexpected fatal error");
    },
    probeState,
    run: () => {
      runCount += 1;
      return deferred.promise;
    },
    timers: {
      clearInterval: () => {
        clearIntervalCalls += 1;
        intervalCallback = undefined;
      },
      setInterval: (callback, timeout) => {
        intervalCallback = callback;
        intervalMs = timeout;
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
    },
  });

  task.start();

  assert.equal(runCount, 1);
  assert.equal(intervalMs, 5 * 60_000);
  assert.equal(probeState.hasCompletedInitialRun(), false);

  const stopPromise = task.stop();
  let stopResolved = false;

  stopPromise.then(() => {
    stopResolved = true;
  });

  assert.equal(clearIntervalCalls, 1);
  assert.equal(stopResolved, false);
  assert.equal(intervalCallback, undefined);

  deferred.resolve();
  await stopPromise;

  assert.equal(stopResolved, true);
  assert.equal(runCount, 1);
  assert.equal(probeState.hasCompletedInitialRun(), true);
});

test("polling task waits for the initial run before marking probes ready", async () => {
  const probeState = createProbeState();
  const deferred = createDeferred<void>();
  let intervalCallback: (() => void) | undefined;
  let runCount = 0;

  const task = createPollingTask({
    intervalMs: 1_000,
    logger: {
      error: () => {},
      log: () => {},
    },
    metrics: {
      observeRunDuration: () => {},
      recordFailure: () => {},
    },
    onFatalError: () => {
      throw new Error("unexpected fatal error");
    },
    probeState,
    run: () => {
      runCount += 1;

      if (runCount === 1) {
        return deferred.promise;
      }
    },
    timers: {
      clearInterval: () => {},
      setInterval: (callback, timeout) => {
        intervalCallback = callback;
        void timeout;
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
    },
  });

  task.start();

  assert.equal(runCount, 1);
  assert.equal(probeState.hasCompletedInitialRun(), false);

  intervalCallback?.();
  await flushMicrotasks();

  assert.equal(runCount, 2);
  assert.equal(probeState.hasCompletedInitialRun(), false);

  const stopPromise = task.stop();
  let stopResolved = false;

  stopPromise.then(() => {
    stopResolved = true;
  });

  assert.equal(stopResolved, false);

  deferred.resolve();
  await stopPromise;

  assert.equal(stopResolved, true);
  assert.equal(probeState.hasCompletedInitialRun(), true);
});

test("polling task keeps readiness after startup succeeds and logs later failures without exiting", async () => {
  const probeState = createProbeState();
  let failureCount = 0;
  let fatalCount = 0;
  let intervalCallback: (() => void) | undefined;
  let runCount = 0;

  const task = createPollingTask({
    intervalMs: 1_000,
    logger: {
      error: () => {},
      log: () => {},
    },
    metrics: {
      observeRunDuration: () => {},
      recordFailure: () => {
        failureCount += 1;
      },
    },
    onFatalError: () => {
      fatalCount += 1;
    },
    probeState,
    run: () => {
      runCount += 1;

      if (runCount === 2) {
        throw new Error("later failure");
      }
    },
    timers: {
      clearInterval: () => {},
      setInterval: (callback, timeout) => {
        intervalCallback = callback;
        void timeout;
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
    },
  });

  task.start();
  await flushMicrotasks();

  assert.equal(runCount, 1);
  assert.equal(probeState.hasCompletedInitialRun(), true);
  assert.equal(failureCount, 0);

  intervalCallback?.();
  await flushMicrotasks();

  assert.equal(runCount, 2);
  assert.equal(probeState.hasCompletedInitialRun(), true);
  assert.equal(failureCount, 1);
  assert.equal(fatalCount, 0);
});

test("polling task fails fast on the first run and keeps probes unavailable", async () => {
  const probeState = createProbeState();
  let clearIntervalCalls = 0;
  let failureCount = 0;
  let fatalError: Error | undefined;

  const task = createPollingTask({
    intervalMs: 1_000,
    logger: {
      error: () => {},
      log: () => {},
    },
    metrics: {
      observeRunDuration: () => {},
      recordFailure: () => {
        failureCount += 1;
      },
    },
    onFatalError: (error) => {
      fatalError = error instanceof Error ? error : new Error(String(error));
    },
    probeState,
    run: () => {
      throw new Error("startup failed");
    },
    timers: {
      clearInterval: () => {
        clearIntervalCalls += 1;
      },
      setInterval: (callback, timeout) => {
        void callback;
        void timeout;
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
    },
  });

  task.start();
  await flushMicrotasks();

  assert.equal(failureCount, 1);
  assert.equal(fatalError?.message, "startup failed");
  assert.equal(probeState.hasCompletedInitialRun(), false);
  assert.equal(clearIntervalCalls, 1);
});
