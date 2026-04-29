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
  const { envPath = DEFAULT_RUNTIME_ENV_PATH, processEnv = process.env } =
    options;
  const dotenvResult = loadDotenv({
    path: envPath,
    processEnv,
    override: true,
    quiet: true,
  });

  if (dotenvResult.error) {
    throw new Error(
      `Unable to load runtime environment from ${envPath}: ${dotenvResult.error.message}`,
      { cause: dotenvResult.error },
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
