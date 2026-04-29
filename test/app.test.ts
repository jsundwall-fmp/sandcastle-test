import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../src/app.js";

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
  } finally {
    await app.close();
  }
});
