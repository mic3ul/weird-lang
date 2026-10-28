import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const bridge = path.join(HERE, "bridge.mjs");
const fixtureDir = path.join(HERE, "node_modules", "weird-test-fixture");

function invoke(payload, env = {}) {
  return spawnSync(process.execPath, [bridge], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    cwd: HERE,
    env: { ...process.env, WEIRD_EXTERNAL_ALLOWLIST: "", ...env },
    timeout: 5000
  });
}

test("denies packages not explicitly allowlisted", () => {
  const result = invoke({ package: "lodash", export: "chunk", args: [[1, 2], 1] });
  assert.notEqual(result.status, 0);
  assert.match(JSON.parse(result.stdout).error, /not in WEIRD_EXTERNAL_ALLOWLIST/);
});

test("calls an allowlisted package export with JSON arguments", async () => {
  try {
    await mkdir(fixtureDir, { recursive: true });
    await writeFile(path.join(fixtureDir, "package.json"), JSON.stringify({
      name: "weird-test-fixture",
      type: "module",
      exports: "./index.js"
    }));
    await writeFile(path.join(fixtureDir, "index.js"), [
      "export function add(a, b) { return a + b; }",
      "export function echo(value) { return value; }",
      "export function nothing() {}",
      ""
    ].join("\n"));

    const result = invoke(
      { package: "weird-test-fixture", export: "add", args: [2, 3] },
      { WEIRD_EXTERNAL_ALLOWLIST: "weird-test-fixture" }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { ok: true, result: 5 });
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
    await rm(path.dirname(fixtureDir), { recursive: false, force: true }).catch(() => {});
  }
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

test("rejects non-array arguments", () => {
  const result = invoke(
    { package: "lodash", export: "chunk", args: { value: 1 } },
    { WEIRD_EXTERNAL_ALLOWLIST: "lodash" }
  );
  assert.notEqual(result.status, 0);
  assert.match(JSON.parse(result.stdout).error, /'args' must be an array/);
});
