import type { JsonObject, JsonRpcMessage, RuntimeConfig } from "./types.js";

export function writeMessage(message: unknown): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

export function writeJsonRpcError(id: unknown, code: number, message: string, data?: unknown): void {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  });
}

export function isJsonRpcRequestWithId(message: unknown): message is JsonRpcMessage & { id: unknown } {
  return isJsonObject(message) && Object.hasOwn(message, "id");
}

export function patchInitializeRequest(message: JsonRpcMessage, config: RuntimeConfig): JsonRpcMessage {
  if (message.method !== "initialize" || !isJsonObject(message.params)) {
    return message;
  }

  return {
    ...message,
    params: {
      ...message.params,
      clientInfo: message.params.clientInfo || {
        name: config.clientName,
        version: config.clientVersion
      }
    }
  };
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
