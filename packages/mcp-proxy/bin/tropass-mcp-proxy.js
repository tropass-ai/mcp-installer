#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { createInterface as createPromptInterface } from "node:readline/promises";
import process from "node:process";

const DEFAULT_MCP_URL = "https://api.tropass.me/mcp";
const DEFAULT_TOKEN_HEADER = "X-API-TOKEN";
const DEFAULT_TIMEOUT_MS = 600_000;
const SUPPORTED_INSTALL_CLIENTS = new Set(["cursor", "vscode", "claude-desktop", "generic"]);

function readConfig() {
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

function parseInstallArgs(argv) {
  const options = {
    client: undefined,
    configPath: undefined,
    mcpUrl: process.env.TROPASS_MCP_URL || DEFAULT_MCP_URL,
    apiToken: process.env.TROPASS_API_TOKEN,
    projectDir: process.cwd(),
    yes: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--client") {
      options.client = argv[++index];
    } else if (arg === "--config") {
      options.configPath = argv[++index];
    } else if (arg === "--url") {
      options.mcpUrl = argv[++index];
    } else if (arg === "--token") {
      options.apiToken = argv[++index];
    } else if (arg === "--project") {
      options.projectDir = argv[++index];
    } else if (arg === "--yes" || arg === "-y") {
      options.yes = true;
    } else if (!arg.startsWith("-") && options.client === undefined) {
      options.client = arg;
    } else {
      throw new Error(`Unknown install argument: ${arg}`);
    }
  }

  return options;
}

function expandHome(filePath) {
  if (filePath === "~") {
    return process.env.HOME || process.env.USERPROFILE || filePath;
  }
  if (filePath.startsWith("~/")) {
    const home = process.env.HOME || process.env.USERPROFILE;
    return home ? path.join(home, filePath.slice(2)) : filePath;
  }
  return filePath;
}

function resolveConfigPath(client, options) {
  if (options.configPath) {
    return path.resolve(expandHome(options.configPath));
  }

  const projectDir = path.resolve(expandHome(options.projectDir));
  if (client === "cursor") {
    return path.join(projectDir, ".cursor", "mcp.json");
  }
  if (client === "vscode") {
    return path.join(projectDir, ".vscode", "mcp.json");
  }
  if (client === "generic") {
    return path.join(projectDir, "mcp.json");
  }
  if (client === "claude-desktop") {
    return resolveClaudeDesktopConfigPath();
  }

  throw new Error(`Unsupported client: ${client}`);
}

function resolveClaudeDesktopConfigPath() {
  if (process.platform === "darwin") {
    return path.join(process.env.HOME || "", "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Roaming");
    return path.join(appData, "Claude", "claude_desktop_config.json");
  }
  return path.join(process.env.HOME || "", ".config", "Claude", "claude_desktop_config.json");
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const payload = fs.readFileSync(filePath, "utf8").trim();
  if (!payload) {
    return {};
  }
  return JSON.parse(payload);
}

function buildServerConfig(mcpUrl, apiToken) {
  return {
    command: "npx",
    args: ["-y", "@tropass/mcp-proxy"],
    env: {
      TROPASS_MCP_URL: mcpUrl,
      TROPASS_API_TOKEN: apiToken
    }
  };
}

function installServerConfig(client, configPath, mcpUrl, apiToken) {
  const payload = readJsonFile(configPath);
  const serverConfig = buildServerConfig(mcpUrl, apiToken);

  if (client === "vscode") {
    payload.servers = {
      ...(payload.servers || {}),
      tropass: {
        type: "stdio",
        ...serverConfig
      }
    };
  } else {
    payload.mcpServers = {
      ...(payload.mcpServers || {}),
      tropass: serverConfig
    };
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function promptForClient() {
  const rl = createPromptInterface({
    input: process.stdin,
    output: process.stderr
  });

  try {
    process.stderr.write("Choose MCP client:\n");
    process.stderr.write("  1. cursor\n");
    process.stderr.write("  2. vscode\n");
    process.stderr.write("  3. claude-desktop\n");
    process.stderr.write("  4. generic\n");
    const answer = (await rl.question("Client [cursor]: ")).trim();
    if (!answer || answer === "1") {
      return "cursor";
    }
    if (answer === "2") {
      return "vscode";
    }
    if (answer === "3") {
      return "claude-desktop";
    }
    if (answer === "4") {
      return "generic";
    }
    return answer;
  } finally {
    rl.close();
  }
}

async function promptForText(question, defaultValue) {
  const rl = createPromptInterface({
    input: process.stdin,
    output: process.stderr
  });

  try {
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    const answer = (await rl.question(`${question}${suffix}: `)).trim();
    return answer || defaultValue;
  } finally {
    rl.close();
  }
}

async function promptForSecret(question) {
  if (!process.stdin.isTTY) {
    return promptForText(question);
  }

  process.stderr.write(`${question}: `);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return await new Promise((resolve) => {
    let value = "";

    const onData = (char) => {
      if (char === "\u0003") {
        process.stderr.write("\n");
        process.exit(130);
      }
      if (char === "\r" || char === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.off("data", onData);
        process.stderr.write("\n");
        resolve(value);
        return;
      }
      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };

    process.stdin.on("data", onData);
  });
}

async function runInstall(argv) {
  const options = parseInstallArgs(argv);
  const client = options.client || await promptForClient();

  if (!SUPPORTED_INSTALL_CLIENTS.has(client)) {
    throw new Error(`Unsupported client '${client}'. Use one of: ${[...SUPPORTED_INSTALL_CLIENTS].join(", ")}.`);
  }

  const mcpUrl = options.yes ? options.mcpUrl : await promptForText("Tropass MCP URL", options.mcpUrl);
  const apiToken = options.apiToken || await promptForSecret("Tropass API token");

  if (!apiToken) {
    throw new Error("Tropass API token is required.");
  }

  const configPath = resolveConfigPath(client, options);
  installServerConfig(client, configPath, mcpUrl, apiToken);

  process.stderr.write(`Installed Tropass MCP for ${client}.\n`);
  process.stderr.write(`Config file: ${configPath}\n`);
  process.stderr.write("Restart or reload your MCP client to pick up the new server.\n");
}

function logError(message, error) {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[tropass-mcp-proxy] ${message}: ${detail}\n`);
}

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function writeJsonRpcError(id, code, message, data) {
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

function patchInitializeRequest(message, config) {
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

async function readResponseBody(response) {
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

function parseSseBody(body) {
  const dataLines = [];
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

async function postMcpMessage(message, config) {
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

function isJsonRpcRequestWithId(message) {
  return Object.hasOwn(message, "id");
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

async function main() {
  if (process.argv[2] === "install") {
    try {
      await runInstall(process.argv.slice(3));
    } catch (error) {
      logError("install failed", error);
      process.exit(1);
    }
    return;
  }

  let config;
  try {
    config = readConfig();
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

main().catch((error) => {
  logError("fatal error", error);
  process.exit(1);
});
