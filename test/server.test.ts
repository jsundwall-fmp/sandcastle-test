import assert from "node:assert/strict";
import test from "node:test";

import { readPollingIntervalMs } from "../src/server.js";

test("readPollingIntervalMs falls back to ten minutes when the env var is missing", () => {
  assert.equal(readPollingIntervalMs({}), 10 * 60_000);
});

test("readPollingIntervalMs uses the configured polling interval in minutes", () => {
  assert.equal(
    readPollingIntervalMs({ POLLING_INTERVAL_MINUTES: "3" }),
    3 * 60_000,
  );
});
