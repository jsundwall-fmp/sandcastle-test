import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../src/app.js";
import { createProbeState } from "../src/probes.js";

test("GET /health returns ok", async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: "ok" });
  } finally {
    await app.close();
  }
});

test("GET /metrics returns prometheus metrics", async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/metrics",
    });

    assert.equal(response.statusCode, 200);
    assert.match(
      response.headers["content-type"] ?? "",
      /text\/plain/,
    );
    assert.match(response.body, /process_cpu_user_seconds_total/);
    assert.match(response.body, /polling_task_runtime_seconds/);
    assert.match(response.body, /polling_task_failures_total/);
  } finally {
    await app.close();
  }
});

test("GET /startup and GET /readiness stay unavailable until the first run succeeds", async () => {
  const probeState = createProbeState();
  const app = buildApp(probeState);

  try {
    const startupResponse = await app.inject({
      method: "GET",
      url: "/startup",
    });
    const readinessResponse = await app.inject({
      method: "GET",
      url: "/readiness",
    });

    assert.equal(startupResponse.statusCode, 503);
    assert.deepEqual(startupResponse.json(), { status: "starting" });
    assert.equal(readinessResponse.statusCode, 503);
    assert.deepEqual(readinessResponse.json(), { status: "starting" });

    probeState.markInitialRunComplete();

    const readyStartupResponse = await app.inject({
      method: "GET",
      url: "/startup",
    });
    const readyReadinessResponse = await app.inject({
      method: "GET",
      url: "/readiness",
    });

    assert.equal(readyStartupResponse.statusCode, 200);
    assert.deepEqual(readyStartupResponse.json(), { status: "ok" });
    assert.equal(readyReadinessResponse.statusCode, 200);
    assert.deepEqual(readyReadinessResponse.json(), { status: "ok" });
  } finally {
    await app.close();
  }
});
