#!/usr/bin/env node
import { pathToFileURL } from "node:url";

const MAX_INPUT = 1024 * 1024;
const MAX_OUTPUT = 1024 * 1024;
const MAX_EXPORT_LENGTH = 200;
const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const PACKAGE_NAME = /^(?:@[a-z0-9._-]+\/[a-z0-9._-]+|[a-z0-9][a-z0-9._-]*)$/;

function fail(message, code = 1) {
  const payload = JSON.stringify({ ok: false, error: String(message).slice(0, 2000) });
  process.stdout.write(payload + "\n");
  process.exitCode = code;
}

function validateRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("request must be a JSON object");
  }

  const packageName = request.package;
  const exportName = request.export ?? "default";
  const args = request.args ?? [];

  if (typeof packageName !== "string" || !PACKAGE_NAME.test(packageName)) {
    throw new Error("invalid package name");
  }
  if (typeof exportName !== "string" || exportName.length > MAX_EXPORT_LENGTH ||
      exportName.split(".").some(part => !part || BLOCKED_KEYS.has(part))) {
    throw new Error("invalid export path");
  }
  if (!Array.isArray(args)) throw new Error("'args' must be an array");

  const allowed = new Set((process.env.WEIRD_EXTERNAL_ALLOWLIST || "")
    .split(",").map(value => value.trim()).filter(Boolean));
  if (!allowed.has(packageName)) {
    throw new Error(`package '${packageName}' is not in WEIRD_EXTERNAL_ALLOWLIST`);
  }

  return { packageName, exportName, args };
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
  const { packageName, exportName, args } = validateRequest(request);

  // Resolve packages relative to this bridge file. Install dependencies in this
  // example directory (or place the bridge beside the project's node_modules).
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
  if (Buffer.byteLength(encoded, "utf8") > MAX_OUTPUT) {
    throw new Error("library result exceeds 1 MiB");
  }
  process.stdout.write(encoded + "\n");
} catch (error) {
  fail(error?.message || error);
}
