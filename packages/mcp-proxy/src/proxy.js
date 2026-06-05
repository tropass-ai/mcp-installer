import { createInterface } from "node:readline";
import process from "node:process";

import { readRuntimeConfig } from "./config.js";
import { postMcpMessage } from "./http-client.js";
import { isJsonRpcRequestWithId, patchInitializeRequest, writeJsonRpcError, writeMessage } from "./json-rpc.js";
import { logError } from "./logging.js";

export async function runProxy() {
  let config;
  try {
    config = readRuntimeConfig();
  } catch (error) {
    logError("configuration error", error);
    process.exit(1);
  }

  const rl = createInterface({
    input: process.stdin,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    await handleLine(line, config);
  }
}

async function handleLine(line, config) {
  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return;
  }

  let message;
  try {
    message = JSON.parse(trimmedLine);
  } catch (error) {
    logError("invalid JSON-RPC message", error);
    writeJsonRpcError(null, -32700, "Parse error");
    return;
  }

  try {
    const patchedMessage = patchInitializeRequest(message, config);
    const responseMessage = await postMcpMessage(patchedMessage, config);
    if (responseMessage !== undefined) {
      writeMessage(responseMessage);
    } else if (isJsonRpcRequestWithId(message)) {
      writeJsonRpcError(message.id, -32603, "Tropass MCP gateway returned an empty response.");
    }
  } catch (error) {
    logError("request failed", error);
    if (isJsonRpcRequestWithId(message)) {
      writeJsonRpcError(message.id, -32603, "Tropass MCP proxy request failed.", {
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

