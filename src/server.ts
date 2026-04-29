import path from "node:path";
import { fileURLToPath } from "node:url";

import type { FastifyInstance } from "fastify";

import { buildApp } from "./app.js";

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 3000;

export async function startServer(): Promise<{
  address: string;
  app: FastifyInstance;
}> {
  const app = buildApp();
  const address = await app.listen({
    host: DEFAULT_HOST,
    port: Number(process.env.PORT ?? DEFAULT_PORT),
  });

  return { address, app };
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
