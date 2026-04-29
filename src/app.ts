import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import { collectDefaultMetrics, register } from "prom-client";

import "./polling-metrics.js";
import { createProbeState, type ProbeState } from "./probes.js";

collectDefaultMetrics();

function replyWithProbeState(
  reply: FastifyReply,
  probeState: ProbeState,
) {
  if (probeState.hasCompletedInitialRun()) {
    reply.code(200);
    return { status: "ok" };
  }

  reply.code(503);
  return { status: "starting" };
}

export function buildApp(
  probeState: ProbeState = createProbeState(),
): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  app.get("/health", () => {
    return { status: "ok" };
  });

  app.get("/startup", (_request, reply) => {
    return replyWithProbeState(reply, probeState);
  });

  app.get("/readiness", (_request, reply) => {
    return replyWithProbeState(reply, probeState);
  });

  app.get("/metrics", async (_request, reply) => {
    reply.type(register.contentType);
    return register.metrics();
  });

  return app;
}
