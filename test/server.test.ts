import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { readPollingIntervalMs, startServer } from "../src/server.js";

test("readPollingIntervalMs falls back to ten minutes when the env var is missing", () => {
  assert.equal(readPollingIntervalMs({}), 10 * 60_000);
});

test("readPollingIntervalMs uses the configured polling interval in minutes", () => {
  assert.equal(
    readPollingIntervalMs({ POLLING_INTERVAL_MINUTES: "3" }),
    3 * 60_000,
  );
});

test("startServer fails before listening when the configured env file is missing", async () => {
  const missingEnvPath = path.join(
    mkdtempSync(path.join(os.tmpdir(), "sandcastle-server-missing-env-")),
    ".env",
  );

  await assert.rejects(
    () =>
      startServer({
        envPath: missingEnvPath,
        processEnv: {},
      }),
    /Unable to load runtime environment/,
  );
});
