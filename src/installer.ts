import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { DEFAULT_MCP_URL, DEFAULT_TOKEN_HEADER, SUPPORTED_INSTALL_CLIENTS } from "./constants.js";
import {
  buildInstructionContent,
  buildSkillContents,
  MANAGED_INSTRUCTIONS_BEGIN,
  MANAGED_INSTRUCTIONS_END
} from "./instructions.js";
import { runInteractiveInstaller, writeInstallResult } from "./interactive-installer.js";
import {
  expandHome,
  resolveCodexConfigPath,
  resolveCodexSkillsPath,
  resolveClaudeCodeConfigPath,
  resolveClaudeCodeInstructionPath,
  resolveCursorConfigPath,
  resolveCursorRulesPath,
  resolveOpenCodeConfigPath,
  resolveOpenCodeInstructionPath
} from "./path-utils.js";
import type {
  InstallClient,
  InstallOptions,
  InstallResult,
  InstallScope,
  JsonObject,
  RawInstallOptions,
  ValidatedInstallOptions
} from "./types.js";

type ServerConfig = {
  url: string;
  headers: Record<string, string>;
  timeout: number;
};

const MANAGED_CODEX_CONFIG_BEGIN = "# BEGIN TROPASS MCP CONFIG";
const MANAGED_CODEX_CONFIG_END = "# END TROPASS MCP CONFIG";
const TOOL_TIMEOUT_SECONDS = 15 * 60;

export async function runInstall(rawOptions: RawInstallOptions = {}): Promise<void> {
  const options = normalizeInstallOptions(rawOptions);
  const client = options.client !== undefined ? validateInstallClient(options.client) : undefined;
  const scope = options.scope !== undefined
    ? validateInstallScope(options.scope)
    : options.yes && client !== undefined
      ? resolveDefaultScope(client)
      : undefined;

  const interactiveOptions = await runInteractiveInstaller({
    ...options,
    client,
    scope
  });

  const result = installTropassMcp({
    ...options,
    ...interactiveOptions
  });

  writeInstallResult(result);
}

export function installTropassMcp(rawOptions: RawInstallOptions): InstallResult {
  const options = validateInstallOptions(normalizeInstallOptions(rawOptions));

  const configPath = resolveConfigPath(options.client, options);
  installServerConfig(options.client, configPath, options.mcpUrl, options.apiToken);

  const instructionPath = resolveInstructionPath(options.client, options);
  installInstructions(options.client, options.scope, instructionPath);

  return {
    client: options.client,
    scope: options.scope,
    configPath,
    instructionPath
  };
}

function normalizeInstallOptions(options: RawInstallOptions): InstallOptions {
  const configPath = options.config ?? options.configPath;
  const apiToken = options.token ?? options.apiToken ?? process.env.TROPASS_API_TOKEN;
  const scope = normalizeScopeOption(options);
  const normalizedOptions: InstallOptions = {
    mcpUrl: options.url ?? options.mcpUrl ?? process.env.TROPASS_MCP_URL ?? DEFAULT_MCP_URL,
    projectDir: options.project ?? options.projectDir ?? process.cwd(),
    yes: Boolean(options.yes)
  };

  if (options.client !== undefined) {
    normalizedOptions.client = options.client;
  }
  if (configPath !== undefined) {
    normalizedOptions.configPath = configPath;
  }
  if (apiToken !== undefined) {
    normalizedOptions.apiToken = apiToken;
  }
  if (scope !== undefined) {
    normalizedOptions.scope = scope;
  }

  return normalizedOptions;
}

function validateInstallOptions(options: InstallOptions): ValidatedInstallOptions {
  const client = validateInstallClient(options.client);
  if (!options.apiToken) {
    throw new Error("Tropass API token is required.");
  }
  if (!options.mcpUrl) {
    throw new Error("Tropass MCP URL is required.");
  }
  const scope = validateInstallScope(options.scope ?? resolveDefaultScope(client));
  return {
    ...options,
    client,
    apiToken: options.apiToken,
    scope
  };
}

function validateInstallClient(value: unknown): InstallClient {
  if (isInstallClient(value)) {
    return value;
  }
  throw new Error(`Unsupported client '${value}'. Use one of: ${[...SUPPORTED_INSTALL_CLIENTS].join(", ")}.`);
}

function normalizeScopeOption(options: RawInstallOptions): string | undefined {
  if (options.global && options.local) {
    throw new Error("Use only one install scope: --global or --local.");
  }
  if (options.global) {
    return "global";
  }
  if (options.local) {
    return "project";
  }
  return options.scope;
}

export function resolveDefaultScope(client: InstallClient): InstallScope {
  void client;
  return "project";
}

function validateInstallScope(value: string): InstallScope {
  if (value === "project" || value === "global") {
    return value;
  }
  if (value === "local") {
    return "project";
  }
  throw new Error(`Unsupported install scope '${value}'. Use one of: project, global.`);
}

function isInstallClient(value: unknown): value is InstallClient {
  return typeof value === "string" && SUPPORTED_INSTALL_CLIENTS.has(value as InstallClient);
}

function resolveConfigPath(client: InstallClient, options: ValidatedInstallOptions): string {
  if (options.configPath) {
    return path.resolve(expandHome(options.configPath));
  }

  const projectDir = path.resolve(expandHome(options.projectDir));
  if (client === "codex") {
    return options.scope === "global" ? resolveCodexConfigPath() : path.join(projectDir, ".codex", "config.toml");
  }
  if (client === "cursor") {
    return options.scope === "global" ? resolveCursorConfigPath() : path.join(projectDir, ".cursor", "mcp.json");
  }
  if (client === "claude") {
    return options.scope === "global" ? resolveClaudeCodeConfigPath() : path.join(projectDir, ".mcp.json");
  }
  if (client === "opencode") {
    return options.scope === "global" ? resolveOpenCodeConfigPath() : path.join(projectDir, "opencode.json");
  }
  throw new Error(`Unsupported client '${client}'.`);
}

function resolveInstructionPath(client: InstallClient, options: ValidatedInstallOptions): string {
  const projectDir = path.resolve(expandHome(options.projectDir));
  if (client === "codex") {
    const skillsPath = options.scope === "global" ? resolveCodexSkillsPath() : path.join(projectDir, ".codex", "skills");
    return path.join(skillsPath, "tropass-gateway", "SKILL.md");
  }
  if (client === "cursor") {
    const rulesPath = options.scope === "global" ? resolveCursorRulesPath() : path.join(projectDir, ".cursor", "rules");
    return path.join(rulesPath, "tropass-mcp.mdc");
  }
  if (client === "claude") {
    return options.scope === "global" ? resolveClaudeCodeInstructionPath() : path.join(projectDir, "CLAUDE.md");
  }
  if (client === "opencode") {
    return options.scope === "global" ? resolveOpenCodeInstructionPath() : path.join(projectDir, "AGENTS.md");
  }
  throw new Error(`Unsupported client '${client}'.`);
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
    url: mcpUrl,
    headers: {
      [DEFAULT_TOKEN_HEADER]: apiToken
    },
    timeout: TOOL_TIMEOUT_SECONDS
  };
}

function installServerConfig(client: InstallClient, configPath: string, mcpUrl: string, apiToken: string): void {
  if (client === "codex") {
    installCodexServerConfig(configPath, mcpUrl, apiToken);
    return;
  }

  const payload = readJsonFile(configPath);
  const serverConfig = buildServerConfig(mcpUrl, apiToken);

  payload.mcpServers = {
    ...readObjectProperty(payload, "mcpServers"),
    tropass: serverConfig
  };

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function installCodexServerConfig(configPath: string, mcpUrl: string, apiToken: string): void {
  const managedBlock = [
    MANAGED_CODEX_CONFIG_BEGIN,
    "[mcp_servers.tropass]",
    `url = ${stringifyTomlValue(mcpUrl)}`,
    `http_headers = { ${stringifyTomlKey(DEFAULT_TOKEN_HEADER)} = ${stringifyTomlValue(apiToken)} }`,
    `tool_timeout_sec = ${TOOL_TIMEOUT_SECONDS}`,
    MANAGED_CODEX_CONFIG_END
  ].join("\n");

  if (!fs.existsSync(configPath)) {
    writeTextFile(configPath, managedBlock);
    return;
  }

  const existingContent = fs.readFileSync(configPath, "utf8");
  const startIndex = existingContent.indexOf(MANAGED_CODEX_CONFIG_BEGIN);
  const endIndex = existingContent.indexOf(MANAGED_CODEX_CONFIG_END);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const before = existingContent.slice(0, startIndex).trimEnd();
    const after = existingContent.slice(endIndex + MANAGED_CODEX_CONFIG_END.length).trimStart();
    writeTextFile(configPath, [before, managedBlock, after].filter(Boolean).join("\n\n"));
    return;
  }

  writeTextFile(configPath, `${existingContent.trimEnd()}\n\n${managedBlock}\n`);
}

function stringifyTomlKey(value: string): string {
  return JSON.stringify(value);
}

function stringifyTomlValue(value: string): string {
  return JSON.stringify(value);
}

function installInstructions(client: InstallClient, scope: InstallScope, instructionPath: string): void {
  if (client === "codex") {
    installCodexSkills(instructionPath);
    return;
  }

  const instructionContent = buildInstructionContent(client);
  if (client === "opencode" || client === "claude") {
    upsertManagedInstructionBlock(instructionPath, instructionContent);
    return;
  }
  writeTextFile(instructionPath, instructionContent);
}

function installCodexSkills(primaryInstructionPath: string): void {
  const skillsPath = path.dirname(path.dirname(primaryInstructionPath));
  for (const skillContent of buildSkillContents()) {
    writeTextFile(path.join(skillsPath, skillContent.name, "SKILL.md"), skillContent.content);
  }
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
