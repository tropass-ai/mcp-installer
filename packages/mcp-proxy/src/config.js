import process from "node:process";

import { DEFAULT_MCP_URL, DEFAULT_TIMEOUT_MS, DEFAULT_TOKEN_HEADER } from "./constants.js";

export function readRuntimeConfig() {
  const mcpUrl = process.env.TROPASS_MCP_URL || DEFAULT_MCP_URL;
  const apiToken = process.env.TROPASS_API_TOKEN;
  const tokenHeader = process.env.TROPASS_API_TOKEN_HEADER || DEFAULT_TOKEN_HEADER;
  const timeoutMs = Number(process.env.TROPASS_MCP_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  if (!apiToken) {
    throw new Error("TROPASS_API_TOKEN is required.");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("TROPASS_MCP_TIMEOUT_MS must be a positive number.");
  }

  return {
    mcpUrl,
    apiToken,
    tokenHeader,
    timeoutMs,
    clientName: process.env.TROPASS_MCP_CLIENT_NAME || "tropass-mcp-proxy",
    clientVersion: process.env.TROPASS_MCP_CLIENT_VERSION || "0.1.0"
  };
}

