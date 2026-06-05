#!/usr/bin/env node

import process from "node:process";

const DEFAULT_MCP_URL = "https://api.tropass.me/mcp";
const DEFAULT_TOKEN_HEADER = "X-API-TOKEN";

const mcpUrl = process.env.TROPASS_MCP_URL || DEFAULT_MCP_URL;
const apiToken = process.env.TROPASS_API_TOKEN;
const tokenHeader = process.env.TROPASS_API_TOKEN_HEADER || DEFAULT_TOKEN_HEADER;

if (!apiToken) {
  process.stderr.write("TROPASS_API_TOKEN is required.\n");
  process.exit(1);
}

async function post(method, id, params = {}) {
  const response = await fetch(mcpUrl, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/event-stream",
      "Content-Type": "application/json",
      [tokenHeader]: apiToken
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params
    })
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
  }
  return parseBody(response.headers.get("content-type") || "", body);
}

function parseBody(contentType, body) {
  if (!body) {
    return undefined;
  }
  if (contentType.includes("text/event-stream")) {
    const dataLines = [];
    for (const line of body.split(/\r?\n/)) {
      if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trimStart());
      }
    }
    return dataLines.length === 0 ? undefined : JSON.parse(dataLines.join("\n"));
  }
  return JSON.parse(body);
}

const initializeResponse = await post("initialize", 1, {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: {
    name: "tropass-smoke-check",
    version: "0.1.0"
  }
});

const toolsResponse = await post("tools/list", 2);
const tools = toolsResponse?.result?.tools || [];

console.log(`Tropass MCP URL: ${mcpUrl}`);
console.log(`Tools list changed: ${initializeResponse?.result?.capabilities?.tools?.listChanged ?? "unknown"}`);
console.log(`Available tools: ${tools.length}`);

for (const tool of tools) {
  console.log(`- ${tool.title || tool.name} (${tool.name})`);
}

