export type InstallClient = "opencode";
export type InstallScope = "project" | "global";
export type ModelCallVersion = "1" | "2";

export type RawInstallOptions = {
  client?: string;
  config?: string;
  configPath?: string;
  url?: string;
  mcpUrl?: string;
  llmUrl?: string;
  llmGatewayUrl?: string;
  token?: string;
  apiToken?: string;
  project?: string;
  projectDir?: string;
  scope?: string;
  uvxCommand?: string;
  global?: boolean;
  local?: boolean;
  yes?: boolean;
};

export type InstallOptions = {
  client?: string;
  configPath?: string;
  mcpUrl: string;
  llmUrl: string;
  apiToken?: string;
  projectDir: string;
  scope?: string;
  uvxCommand?: string;
  yes: boolean;
};

export type ValidatedInstallOptions = Omit<InstallOptions, "client" | "apiToken" | "scope"> & {
  client: InstallClient;
  apiToken: string;
  scope: InstallScope;
  modelCallVersion: ModelCallVersion;
};

export type InstallResult = {
  client: InstallClient;
  scope: InstallScope;
  configPath: string;
  skillPaths: string[];
  toolPaths: string[];
  pluginPaths: string[];
  removedToolPaths: string[];
  modelCallVersion: ModelCallVersion;
  uvxCommand?: string;
};

export type JsonObject = Record<string, unknown>;
