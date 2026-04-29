import path from "node:path";
import { fileURLToPath } from "node:url";

import type { FastifyInstance } from "fastify";

import { buildApp } from "./app.js";
import { createPollingTask } from "./polling-task.js";
import { pollingMetrics } from "./polling-metrics.js";
import { createProbeState } from "./probes.js";
import {
  loadRuntimeConfig,
  type RuntimeConfigOptions,
} from "./runtime-config.js";

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_POLLING_INTERVAL_MINUTES = 10;

export interface PollingEnvironment {
  POLLING_INTERVAL_MINUTES?: string;
}

export function readPollingIntervalMs(
  env: PollingEnvironment = process.env,
): number {
  const pollingIntervalMinutes = Number(
    env.POLLING_INTERVAL_MINUTES ?? DEFAULT_POLLING_INTERVAL_MINUTES,
  );

  if (!Number.isFinite(pollingIntervalMinutes) || pollingIntervalMinutes <= 0) {
    return DEFAULT_POLLING_INTERVAL_MINUTES * 60_000;
  }

  return pollingIntervalMinutes * 60_000;
}

export interface StartServerOptions extends RuntimeConfigOptions {
  pollingEnvironment?: PollingEnvironment;
}

export async function startServer(
  options: StartServerOptions = {},
): Promise<{
  address: string;
  app: FastifyInstance;
}> {
  const runtimeEnvironment = options.processEnv ?? process.env;
  const runtimeConfig = loadRuntimeConfig({
    envPath: options.envPath,
    processEnv: runtimeEnvironment,
  });
  const pollingEnvironment = options.pollingEnvironment ?? runtimeEnvironment;
  const probeState = createProbeState();
  const pollingTask = createPollingTask({
    intervalMs: readPollingIntervalMs(pollingEnvironment),
    metrics: pollingMetrics,
    onFatalError: () => {
      process.exit(1);
    },
    probeState,
  });
  const app = buildApp(probeState);

  app.addHook("onClose", async () => {
    await pollingTask.stop();
  });

  pollingTask.start();

  try {
    const address = await app.listen({
      host: DEFAULT_HOST,
      port: runtimeConfig.port,
    });

    return { address, app };
  } catch (error) {
    await pollingTask.stop();
    throw error;
  }
}

function isMainModule(): boolean {
  const entryPoint = process.argv[1];

  if (entryPoint === undefined) {
    return false;
  }

  return fileURLToPath(import.meta.url) === path.resolve(entryPoint);
}

if (isMainModule()) {
  void startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
