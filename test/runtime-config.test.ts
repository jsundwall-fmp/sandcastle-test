import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadRuntimeConfig } from "../src/runtime-config.js";

function createTempEnvFile(contents: string): string {
  const directory = mkdtempSync(
    path.join(os.tmpdir(), "sandcastle-runtime-config-"),
  );
  const envPath = path.join(directory, ".env");

  writeFileSync(envPath, contents);

  return envPath;
}

test("loadRuntimeConfig loads PORT from the root .env file", () => {
  const processEnv: Record<string, string | undefined> = {};
  const runtimeConfig = loadRuntimeConfig({
    envPath: createTempEnvFile("PORT=4321\n"),
    processEnv,
  });

  assert.deepEqual(runtimeConfig, { port: 4321 });
  assert.equal(processEnv.PORT, "4321");
});

test("loadRuntimeConfig fails when the .env file is missing", () => {
  const missingEnvPath = path.join(
    mkdtempSync(path.join(os.tmpdir(), "sandcastle-missing-env-")),
    ".env",
  );

  assert.throws(
    () => loadRuntimeConfig({ envPath: missingEnvPath, processEnv: {} }),
    /Unable to load runtime environment/,
  );
});

test("loadRuntimeConfig fails when PORT is missing", () => {
  assert.throws(
    () => loadRuntimeConfig({ envPath: createTempEnvFile(""), processEnv: {} }),
    /PORT/,
  );
});

test("loadRuntimeConfig fails when PORT is invalid", () => {
  assert.throws(
    () =>
      loadRuntimeConfig({
        envPath: createTempEnvFile("PORT=not-a-port\n"),
        processEnv: {},
      }),
    /Expected number, received string/,
  );
});
