import path from "node:path";
import process from "node:process";

import { DEFAULT_MCP_URL, LLM_GATEWAY_URL, SUPPORTED_INSTALL_CLIENTS } from "./constants.js";
import { runInteractiveInstaller, writeInstallResult } from "./interactive-installer.js";
import { opencodeInstaller } from "./installers/opencode.js";
import {
  expandHome,
  resolveOpenCodeConfigPath
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
  const client = validateInstallClient(options.client ?? "opencode");
  const scope = options.scope !== undefined
    ? validateInstallScope(options.scope)
    : options.yes
      ? resolveDefaultScope()
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

  const configPath = resolveConfigPath(options);
  opencodeInstaller.installConfig(options, configPath);
  opencodeInstaller.installProvider(options, configPath);

  const skillPaths = opencodeInstaller.installSkills(resolveSkillsPath(options));

  return {
    client: options.client,
    scope: options.scope,
    configPath,
    skillPaths
  };
}

function normalizeInstallOptions(options: RawInstallOptions): InstallOptions {
  const configPath = options.config ?? options.configPath;
  const apiToken = options.token ?? options.apiToken ?? process.env.TROPASS_API_TOKEN;
  const scope = normalizeScopeOption(options);
  const normalizedOptions: InstallOptions = {
    mcpUrl: normalizeMcpUrl(
      options.url ?? options.mcpUrl ?? process.env.TROPASS_MCP_URL ?? DEFAULT_MCP_URL
    ),
    llmUrl: stripTrailingSlashes(
      options.llmUrl ?? options.llmGatewayUrl ?? process.env.TROPASS_LLM_URL ?? LLM_GATEWAY_URL
    ),
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
  const client = validateInstallClient(options.client ?? "opencode");
  if (!options.apiToken) {
    throw new Error("Tropass API token is required.");
  }
  if (!options.mcpUrl) {
    throw new Error("Tropass MCP URL is required.");
  }
  if (!options.llmUrl) {
    throw new Error("Tropass LLM URL is required.");
  }
  const scope = validateInstallScope(options.scope ?? resolveDefaultScope());
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

export function resolveDefaultScope(): InstallScope {
  return "global";
}

function validateInstallScope(value: string): InstallScope {
  if (value === "project" || value === "global") {
    return value;
  }
  if (value === "local") {
    return "project";
  }
  throw new Error(`Unsupported install scope '${value}'. Use one of: global, project.`);
}

function isInstallClient(value: unknown): value is InstallClient {
  return typeof value === "string" && SUPPORTED_INSTALL_CLIENTS.has(value as InstallClient);
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeMcpUrl(value: string): string {
  const url = stripTrailingSlashes(value);
  return !url || url.endsWith("/mcp") ? url : `${url}/mcp`;
}

function resolveConfigPath(options: ValidatedInstallOptions): string {
  if (options.configPath) {
    return path.resolve(expandHome(options.configPath));
  }

  const projectDir = path.resolve(expandHome(options.projectDir));
  return options.scope === "global" ? resolveOpenCodeConfigPath() : path.join(projectDir, "opencode.json");
}

function resolveSkillsPath(options: ValidatedInstallOptions): string {
  const projectDir = path.resolve(expandHome(options.projectDir));
  return options.scope === "global"
    ? path.join(path.dirname(resolveOpenCodeConfigPath()), "skills")
    : path.join(projectDir, ".opencode", "skills");
}
