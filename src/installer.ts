import path from "node:path";
import process from "node:process";

import {
  ASYNC_MODEL_CALL_VERSION,
  DEFAULT_MCP_URL,
  LLM_GATEWAY_URL,
  SUPPORTED_INSTALL_CLIENTS,
  SYNC_MODEL_CALL_VERSION
} from "./constants.js";
import { runInteractiveInstaller, writeInstallResult } from "./interactive-installer.js";
import { opencodeInstaller } from "./installers/opencode.js";
import { findUvx } from "./uvx.js";
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

  writeInstallResult(installTropassMcp({
    ...options,
    ...interactiveOptions
  }));
}

export function installTropassMcp(rawOptions: RawInstallOptions): InstallResult {
  const options = validateInstallOptions(normalizeInstallOptions(rawOptions));

  const configPath = resolveConfigPath(options);
  opencodeInstaller.installConfig(options, configPath);
  opencodeInstaller.installProvider(options, configPath);

  const skillPaths = opencodeInstaller.installSkills(resolveSkillsPath(options));
  const uvxCommand = options.uvxCommand;
  const toolPaths = uvxCommand
    ? opencodeInstaller.installTools(
      resolveToolsPath(options),
      options.mcpUrl,
      options.apiToken,
      uvxCommand,
    )
    : [];
  const removedToolPaths = uvxCommand
    ? []
    : opencodeInstaller.removeTools(resolveToolsPath(options));
  const pluginPaths = opencodeInstaller.installPlugins(
    path.dirname(resolveToolsPath(options)),
    configPath,
    options,
  );

  return {
    client: options.client,
    scope: options.scope,
    configPath,
    skillPaths,
    toolPaths,
    removedToolPaths,
    pluginPaths,
    modelCallVersion: options.modelCallVersion,
    ...(uvxCommand && { uvxCommand })
  };
}

function normalizeInstallOptions(options: RawInstallOptions): InstallOptions {
  const configPath = options.config ?? options.configPath;
  const apiToken = options.token ?? options.apiToken ?? process.env.TROPASS_API_TOKEN;
  const scope = normalizeScopeOption(options);
  const normalizedOptions: InstallOptions = {
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
  const uvxCommand = options.uvxCommand ?? findUvx();
  if (uvxCommand !== undefined) {
    normalizedOptions.uvxCommand = uvxCommand;
  }

  return normalizedOptions;
}

function validateInstallOptions(options: InstallOptions): ValidatedInstallOptions {
  const client = validateInstallClient(options.client ?? "opencode");
  if (!options.apiToken) {
    throw new Error("Необходимо указать API-токен Tropass.");
  }
  const scope = validateInstallScope(options.scope ?? resolveDefaultScope());
  return {
    ...options,
    client,
    mcpUrl: DEFAULT_MCP_URL,
    llmUrl: LLM_GATEWAY_URL,
    apiToken: options.apiToken,
    scope,
    modelCallVersion: options.uvxCommand ? ASYNC_MODEL_CALL_VERSION : SYNC_MODEL_CALL_VERSION
  };
}

function validateInstallClient(value: unknown): InstallClient {
  if (isInstallClient(value)) {
    return value;
  }
  throw new Error(`Клиент '${value}' не поддерживается. Доступные клиенты: ${[...SUPPORTED_INSTALL_CLIENTS].join(", ")}.`);
}

function normalizeScopeOption(options: RawInstallOptions): string | undefined {
  if (options.global && options.local) {
    throw new Error("Выберите только одну область установки: --global или --local.");
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
  throw new Error(`Область установки '${value}' не поддерживается. Используйте global или project.`);
}

function isInstallClient(value: unknown): value is InstallClient {
  return typeof value === "string" && SUPPORTED_INSTALL_CLIENTS.has(value as InstallClient);
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
  if (options.scope !== "global") {
    return path.join(projectDir, ".opencode", "skills");
  }

  if (options.configPath) {
    return path.join(path.dirname(path.resolve(expandHome(options.configPath))), "skills");
  }

  return path.join(path.dirname(resolveOpenCodeConfigPath()), "skills");
}

function resolveToolsPath(options: ValidatedInstallOptions): string {
  const projectDir = path.resolve(expandHome(options.projectDir));
  if (options.scope !== "global") {
    return path.join(projectDir, ".opencode", "tools");
  }

  if (options.configPath) {
    return path.join(path.dirname(path.resolve(expandHome(options.configPath))), "tools");
  }

  return path.join(path.dirname(resolveOpenCodeConfigPath()), "tools");
}
