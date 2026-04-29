import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildApp } from "./app.js";

export async function startServer() {
  const app = buildApp();
  const address = await app.listen({
    host: "0.0.0.0",
    port: Number(process.env.PORT ?? 3000),
  });

  return { address, app };
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entrypoint && fileURLToPath(import.meta.url) === entrypoint) {
  startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
