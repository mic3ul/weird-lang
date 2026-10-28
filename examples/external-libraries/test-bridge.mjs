import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const bridge = path.join(path.dirname(fileURLToPath(import.meta.url)), "bridge.mjs");

function invoke(payload, env = {}) {
  return spawnSync(process.execPath, [bridge], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: { ...process.env, WEIRD_EXTERNAL_ALLOWLIST: "", ...env }
  });
}

test("denies packages not explicitly allowlisted", () => {
  const result = invoke({ package: "lodash", export: "chunk", args: [[1, 2], 1] });
  assert.notEqual(result.status, 0);
  assert.match(JSON.parse(result.stdout).error, /not in WEIRD_EXTERNAL_ALLOWLIST/);
});

test("rejects unsafe export paths", () => {
  const result = invoke(
    { package: "lodash", export: "constructor.constructor", args: [] },
    { WEIRD_EXTERNAL_ALLOWLIST: "lodash" }
  );
  assert.notEqual(result.status, 0);
  assert.match(JSON.parse(result.stdout).error, /invalid export path/);
});

test("rejects invalid package names", () => {
  const result = invoke(
    { package: "../lodash", export: "chunk", args: [] },
    { WEIRD_EXTERNAL_ALLOWLIST: "../lodash" }
  );
  assert.notEqual(result.status, 0);
  assert.match(JSON.parse(result.stdout).error, /invalid package name/);
});
