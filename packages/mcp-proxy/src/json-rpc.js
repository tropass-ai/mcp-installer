export function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

export function writeJsonRpcError(id, code, message, data) {
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

export function isJsonRpcRequestWithId(message) {
  return Object.hasOwn(message, "id");
}

export function patchInitializeRequest(message, config) {
  if (message?.method !== "initialize" || typeof message.params !== "object" || message.params === null) {
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

