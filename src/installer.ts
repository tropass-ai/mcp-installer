import path from "node:path";
import process from "node:process";

import { DEFAULT_MCP_URL, SUPPORTED_INSTALL_CLIENTS } from "./constants.js";
import { runInteractiveInstaller, writeInstallResult } from "./interactive-installer.js";
import { resolveHarnessInstaller } from "./installers/index.js";
import {
  expandHome,
  resolveCodexConfigPath,
  resolveCodexSkillsPath,
  resolveClaudeCodeConfigPath,
  resolveClaudeCodeInstructionPath,
  resolveOpenCodeConfigPath,
  resolveOpenCodeInstructionPath
} from "./path-utils.js";
import type {
  InstallClient,
  InstallOptions,
  InstallResult,
  InstallScope,
  RawInstallOptions,
  ValidatedInstallOptions
} from "./types.js";

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
  const installer = resolveHarnessInstaller(options.client);

  const configPath = resolveConfigPath(options.client, options);
  installer.installConfig(options, configPath);

  const instructionPath = resolveInstructionPath(options.client, options);
  installer.installInstructions(options, instructionPath);

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
  if (client === "claude") {
    return options.scope === "global" ? resolveClaudeCodeInstructionPath() : path.join(projectDir, "CLAUDE.md");
  }
  if (client === "opencode") {
    return options.scope === "global" ? resolveOpenCodeInstructionPath() : path.join(projectDir, "AGENTS.md");
  }
  throw new Error(`Unsupported client '${client}'.`);
}
