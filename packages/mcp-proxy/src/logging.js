export function logError(message, error) {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[tropass-mcp-proxy] ${message}: ${detail}\n`);
}

