import fs from "node:fs";
import path from "node:path";
import { createInterface as createPromptInterface } from "node:readline/promises";
import process from "node:process";

import { DEFAULT_MCP_URL, SUPPORTED_INSTALL_CLIENTS } from "./constants.js";
import { buildInstructionContent, MANAGED_INSTRUCTIONS_BEGIN, MANAGED_INSTRUCTIONS_END } from "./instructions.js";
import { expandHome, resolveClaudeDesktopConfigPath } from "./path-utils.js";
import type {
  InstallClient,
  InstallOptions,
  InstallResult,
  JsonObject,
  RawInstallOptions,
  ValidatedInstallOptions
} from "./types.js";

type ServerConfig = {
  command: "npx";
  args: ["-y", "@tropass/mcp-proxy"];
  env: {
    TROPASS_MCP_URL: string;
    TROPASS_API_TOKEN: string;
  };
};

export async function runInstall(rawOptions: RawInstallOptions = {}): Promise<void> {
  const options = normalizeInstallOptions(rawOptions);
  const client = options.client ?? await promptForClient();
  const mcpUrl = options.yes ? options.mcpUrl : await promptForText("Tropass MCP URL", options.mcpUrl);
  const apiToken = options.apiToken ?? await promptForSecret("Tropass API token");

  const result = installTropassMcp({
    ...options,
    client,
    mcpUrl,
    apiToken
  });

  process.stderr.write(`Installed Tropass MCP for ${result.client}.\n`);
  process.stderr.write(`Config file: ${result.configPath}\n`);
  process.stderr.write(`Instructions file: ${result.instructionPath}\n`);
  process.stderr.write("Restart or reload your MCP client to pick up the new server.\n");
}

export function installTropassMcp(rawOptions: RawInstallOptions): InstallResult {
  const options = validateInstallOptions(normalizeInstallOptions(rawOptions));

  const configPath = resolveConfigPath(options.client, options);
  installServerConfig(options.client, configPath, options.mcpUrl, options.apiToken);

  const instructionPath = resolveInstructionPath(options.client, options, configPath);
  installInstructions(options.client, instructionPath);

  return {
    client: options.client,
    configPath,
    instructionPath
  };
}

function normalizeInstallOptions(options: RawInstallOptions): InstallOptions {
  return {
    client: options.client,
    configPath: options.config ?? options.configPath,
    mcpUrl: options.url ?? options.mcpUrl ?? process.env.TROPASS_MCP_URL ?? DEFAULT_MCP_URL,
    apiToken: options.token ?? options.apiToken ?? process.env.TROPASS_API_TOKEN,
    projectDir: options.project ?? options.projectDir ?? process.cwd(),
    yes: Boolean(options.yes)
  };
}

function validateInstallOptions(options: InstallOptions): ValidatedInstallOptions {
  if (!isInstallClient(options.client)) {
    throw new Error(`Unsupported client '${options.client}'. Use one of: ${[...SUPPORTED_INSTALL_CLIENTS].join(", ")}.`);
  }
  if (!options.apiToken) {
    throw new Error("Tropass API token is required.");
  }
  if (!options.mcpUrl) {
    throw new Error("Tropass MCP URL is required.");
  }
  return {
    ...options,
    client: options.client,
    apiToken: options.apiToken
  };
}

function isInstallClient(value: unknown): value is InstallClient {
  return typeof value === "string" && SUPPORTED_INSTALL_CLIENTS.has(value as InstallClient);
}

function resolveConfigPath(client: InstallClient, options: ValidatedInstallOptions): string {
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
  return resolveClaudeDesktopConfigPath();
}

function resolveInstructionPath(client: InstallClient, options: ValidatedInstallOptions, configPath: string): string {
  const projectDir = path.resolve(expandHome(options.projectDir));
  if (client === "cursor") {
    return path.join(projectDir, ".cursor", "rules", "tropass-mcp.mdc");
  }
  if (client === "vscode") {
    return path.join(projectDir, ".github", "copilot-instructions.md");
  }
  if (client === "generic") {
    return path.join(projectDir, "AGENTS.md");
  }
  return path.join(path.dirname(configPath), "tropass-mcp-instructions.md");
}

function readJsonFile(filePath: string): JsonObject {
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

function buildServerConfig(mcpUrl: string, apiToken: string): ServerConfig {
  return {
    command: "npx",
    args: ["-y", "@tropass/mcp-proxy"],
    env: {
      TROPASS_MCP_URL: mcpUrl,
      TROPASS_API_TOKEN: apiToken
    }
  };
}

function installServerConfig(client: InstallClient, configPath: string, mcpUrl: string, apiToken: string): void {
  const payload = readJsonFile(configPath);
  const serverConfig = buildServerConfig(mcpUrl, apiToken);

  if (client === "vscode") {
    payload.servers = {
      ...readObjectProperty(payload, "servers"),
      tropass: {
        type: "stdio",
        ...serverConfig
      }
    };
  } else {
    payload.mcpServers = {
      ...readObjectProperty(payload, "mcpServers"),
      tropass: serverConfig
    };
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function installInstructions(client: InstallClient, instructionPath: string): void {
  const instructionContent = buildInstructionContent(client);
  if (client === "vscode" || client === "generic") {
    upsertManagedInstructionBlock(instructionPath, instructionContent);
    return;
  }
  writeTextFile(instructionPath, instructionContent);
}

function upsertManagedInstructionBlock(filePath: string, content: string): void {
  const managedBlock = `${MANAGED_INSTRUCTIONS_BEGIN}\n${content.trim()}\n${MANAGED_INSTRUCTIONS_END}`;

  if (!fs.existsSync(filePath)) {
    writeTextFile(filePath, managedBlock);
    return;
  }

  const existingContent = fs.readFileSync(filePath, "utf8");
  const startIndex = existingContent.indexOf(MANAGED_INSTRUCTIONS_BEGIN);
  const endIndex = existingContent.indexOf(MANAGED_INSTRUCTIONS_END);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const before = existingContent.slice(0, startIndex).trimEnd();
    const after = existingContent.slice(endIndex + MANAGED_INSTRUCTIONS_END.length).trimStart();
    writeTextFile(filePath, [before, managedBlock, after].filter(Boolean).join("\n\n"));
    return;
  }

  writeTextFile(filePath, `${existingContent.trimEnd()}\n\n${managedBlock}\n`);
}

function writeTextFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.endsWith("\n") ? content : `${content}\n`);
}

function readObjectProperty(payload: JsonObject, key: string): JsonObject {
  const value = payload[key];
  if (value === undefined) {
    return {};
  }
  if (!isJsonObject(value)) {
    throw new Error(`Config field '${key}' must be a JSON object.`);
  }
  return value;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function promptForClient(): Promise<InstallClient> {
  const rl = createPromptInterface({
    input: process.stdin,
    output: process.stderr
  });

  try {
    process.stderr.write("Choose MCP client:\n");
    process.stderr.write("  1. cursor\n");
    process.stderr.write("  2. vscode\n");
    process.stderr.write("  3. claude\n");
    process.stderr.write("  4. generic\n");
    const answer = (await rl.question("Client [cursor]: ")).trim();
    if (!answer || answer === "1") {
      return "cursor";
    }
    if (answer === "2") {
      return "vscode";
    }
    if (answer === "3") {
      return "claude";
    }
    if (answer === "4") {
      return "generic";
    }
    if (isInstallClient(answer)) {
      return answer;
    }
    throw new Error(`Unsupported client '${answer}'. Use one of: ${[...SUPPORTED_INSTALL_CLIENTS].join(", ")}.`);
  } finally {
    rl.close();
  }
}

async function promptForText(question: string, defaultValue?: string): Promise<string> {
  const rl = createPromptInterface({
    input: process.stdin,
    output: process.stderr
  });

  try {
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    const answer = (await rl.question(`${question}${suffix}: `)).trim();
    return answer || defaultValue || "";
  } finally {
    rl.close();
  }
}

async function promptForSecret(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    return promptForText(question);
  }

  process.stderr.write(`${question}: `);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return await new Promise((resolve) => {
    let value = "";

    const onData = (char: string): void => {
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

