import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { parseEnv, port } from "znv";

const DEFAULT_RUNTIME_ENV_PATH = fileURLToPath(
  new URL("../.env", import.meta.url),
);

export interface RuntimeConfig {
  port: number;
}

export interface RuntimeConfigOptions {
  envPath?: string;
  processEnv?: Record<string, string | undefined>;
}

export function loadRuntimeConfig(
  options: RuntimeConfigOptions = {},
): RuntimeConfig {
  const envPath = options.envPath ?? DEFAULT_RUNTIME_ENV_PATH;
  const processEnv = options.processEnv ?? process.env;
  const result = loadDotenv({
    path: envPath,
    processEnv,
    override: true,
    quiet: true,
  });

  if (result.error) {
    throw new Error(
      `Unable to load runtime environment from ${envPath}: ${result.error.message}`,
      { cause: result.error },
    );
  }

  const { PORT } = parseEnv(processEnv, {
    PORT: {
      description: "TCP port for the HTTP server.",
      schema: port(),
    },
  });

  return {
    port: PORT,
  };
}
