import Fastify, { type FastifyInstance } from "fastify";
import { collectDefaultMetrics, register } from "prom-client";

collectDefaultMetrics();

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  app.get("/health", () => {
    return { status: "ok" };
  });

  app.get("/metrics", async (_request, reply) => {
    reply.type(register.contentType);
    return register.metrics();
  });

  return app;
}
