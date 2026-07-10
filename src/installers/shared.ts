import fs from "node:fs";
import path from "node:path";

import { DEFAULT_TOKEN_HEADER } from "../constants.js";
import type { JsonObject } from "../types.js";

export type ServerConfig = {
  url: string;
  headers: Record<string, string>;
  timeout: number;
};

export const TOOL_TIMEOUT_SECONDS = 15 * 60;

export function buildBearerToken(apiToken: string): string {
  return apiToken.startsWith("Bearer ") ? apiToken : `Bearer ${apiToken}`;
}

export function stripBearerToken(apiToken: string): string {
  return apiToken.startsWith("Bearer ") ? apiToken.slice("Bearer ".length) : apiToken;
}

export function buildServerConfig(mcpUrl: string, apiToken: string): ServerConfig {
  return {
    url: mcpUrl,
    headers: {
      [DEFAULT_TOKEN_HEADER]: buildBearerToken(apiToken)
    },
    timeout: TOOL_TIMEOUT_SECONDS
  };
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

export function upsertManagedBlock(filePath: string, content: string, begin: string, end: string): void {
  const managedBlock = `${begin}\n${content.trim()}\n${end}`;

  if (!fs.existsSync(filePath)) {
    writeTextFile(filePath, managedBlock);
    return;
  }

  const existingContent = fs.readFileSync(filePath, "utf8");
  const startIndex = existingContent.indexOf(begin);
  const endIndex = existingContent.indexOf(end);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const before = existingContent.slice(0, startIndex).trimEnd();
    const after = existingContent.slice(endIndex + end.length).trimStart();
    writeTextFile(filePath, [before, managedBlock, after].filter(Boolean).join("\n\n"));
    return;
  }

  writeTextFile(filePath, `${existingContent.trimEnd()}\n\n${managedBlock}\n`);
}

export function stringifyTomlKey(value: string): string {
  return JSON.stringify(value);
}

export function stringifyTomlValue(value: string): string {
  return JSON.stringify(value);
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
