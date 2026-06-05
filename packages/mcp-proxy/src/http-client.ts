import type { RuntimeConfig } from "./types.js";

export async function postMcpMessage(message: unknown, config: RuntimeConfig): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(config.mcpUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json, text/event-stream",
        "Content-Type": "application/json",
        [config.tokenHeader]: config.apiToken
      },
      body: JSON.stringify(message),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
    }

    return await readResponseBody(response);
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  if (!body) {
    return undefined;
  }
  if (contentType.includes("text/event-stream")) {
    return parseSseBody(body);
  }
  return JSON.parse(body);
}

function parseSseBody(body: string): unknown {
  const dataLines: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }
  if (dataLines.length === 0) {
    return undefined;
  }
  return JSON.parse(dataLines.join("\n"));
}
