export function logError(message: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[tropass-connect] ${message}: ${detail}\n`);
}
