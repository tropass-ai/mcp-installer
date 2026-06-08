export type InstallClient = "codex" | "cursor" | "vscode" | "claude" | "generic";

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
  yes?: boolean;
};

export type InstallOptions = {
  client?: string;
  configPath?: string;
  mcpUrl: string;
  apiToken?: string;
  projectDir: string;
  yes: boolean;
};

export type ValidatedInstallOptions = Omit<InstallOptions, "client" | "apiToken"> & {
  client: InstallClient;
  apiToken: string;
};

export type InstallResult = {
  client: InstallClient;
  configPath: string;
  instructionPath: string;
};

export type JsonObject = Record<string, unknown>;
