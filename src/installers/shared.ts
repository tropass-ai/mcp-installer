import fs from "node:fs";
import path from "node:path";

import type { JsonObject } from "../types.js";

export function buildBearerToken(apiToken: string): string {
  return apiToken.startsWith("Bearer ") ? apiToken : `Bearer ${apiToken}`;
}

export function stripBearerToken(apiToken: string): string {
  return apiToken.startsWith("Bearer ") ? apiToken.slice("Bearer ".length) : apiToken;
}

export function readJsonFile(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const payload = fs.readFileSync(filePath, "utf8").trim();
  if (!payload) {
    return {};
  }

  const parsedPayload: unknown = JSON.parse(payload);
  if (!isJsonObject(parsedPayload)) {
    throw new Error(`${filePath} must contain a JSON object.`);
  }
  return parsedPayload;
}

export function writeJsonFile(filePath: string, payload: JsonObject): void {
  writeTextFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

export function writeTextFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.endsWith("\n") ? content : `${content}\n`);
}

export function readObjectProperty(payload: JsonObject, key: string): JsonObject {
  const value = payload[key];
  if (value === undefined) {
    return {};
  }
  if (!isJsonObject(value)) {
    throw new Error(`Config field '${key}' must be a JSON object.`);
  }
  return value;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
