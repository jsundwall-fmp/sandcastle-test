import path from "node:path";
import { fileURLToPath } from "node:url";

import type { FastifyInstance } from "fastify";

import { buildApp } from "./app.js";

export async function startServer(): Promise<{
  address: string;
  app: FastifyInstance;
}> {
  const app = buildApp();
  const address = await app.listen({
    host: "0.0.0.0",
    port: Number(process.env.PORT ?? 3000),
  });

  return { address, app };
}

const isMainModule =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  void startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
