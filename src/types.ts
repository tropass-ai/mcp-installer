export type InstallClient = "codex" | "claude" | "opencode";
export type InstallScope = "project" | "global";

export type RawInstallOptions = {
  client?: string;
  config?: string;
  configPath?: string;
  url?: string;
  mcpUrl?: string;
  token?: string;
  apiToken?: string;
  project?: string;
  projectDir?: string;
  scope?: string;
  global?: boolean;
  local?: boolean;
  yes?: boolean;
};

export type InstallOptions = {
  client?: string;
  configPath?: string;
  mcpUrl: string;
  apiToken?: string;
  projectDir: string;
  scope?: string;
  yes: boolean;
};

export type ValidatedInstallOptions = Omit<InstallOptions, "client" | "apiToken" | "scope"> & {
  client: InstallClient;
  apiToken: string;
  scope: InstallScope;
};

export type InstallResult = {
  client: InstallClient;
  scope: InstallScope;
  configPath: string;
  instructionPath: string;
};

export type JsonObject = Record<string, unknown>;
