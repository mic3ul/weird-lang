#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const MAX_INPUT = 1024 * 1024;
const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function fail(message, code = 1) {
  process.stdout.write(JSON.stringify({ ok: false, error: String(message).slice(0, 2000) }) + "\n");
  process.exitCode = code;
}

try {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > MAX_INPUT) throw new Error("request exceeds 1 MiB");
    chunks.push(chunk);
  }
  const request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const packageName = request?.package;
  const exportName = request?.export ?? "default";
  const args = request?.args ?? [];

  if (typeof packageName !== "string" ||
      !/^(?:@[A-Za-z0-9._-]+\/)?[A-Za-z0-9._-]+$/.test(packageName)) {
    throw new Error("invalid package name");
  }
  if (typeof exportName !== "string" || exportName.length > 200 ||
      exportName.split(".").some(part => !part || BLOCKED_KEYS.has(part))) {
    throw new Error("invalid export path");
  }
  if (!Array.isArray(args)) throw new Error("'args' must be an array");

  const allowed = new Set((process.env.WEIRD_EXTERNAL_ALLOWLIST || "")
    .split(",").map(value => value.trim()).filter(Boolean));
  if (!allowed.has(packageName)) {
    throw new Error(`package '${packageName}' is not in WEIRD_EXTERNAL_ALLOWLIST`);
  }

  const imported = await import(packageName);
  let target = imported;
  for (const part of exportName.split(".")) target = target?.[part];
  if (typeof target !== "function") {
    throw new Error(`export '${exportName}' is not a function in '${packageName}'`);
  }

  const result = await target(...args);
  let encoded;
  try {
    encoded = JSON.stringify({ ok: true, result: result === undefined ? null : result });
  } catch {
    throw new Error("library result is not JSON-serializable");
  }
  if (encoded === undefined) throw new Error("library result is not JSON-serializable");
  process.stdout.write(encoded + "\n");
} catch (error) {
  fail(error?.message || error);
}
