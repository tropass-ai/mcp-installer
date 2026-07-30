import type { ValidatedInstallOptions } from "../types.js";

export type HarnessInstaller = {
  installConfig(options: ValidatedInstallOptions, configPath: string): void;
  installProvider(options: ValidatedInstallOptions, configPath: string): void;
  installSkills(skillsPath: string): string[];
  installTools(toolsPath: string, mcpUrl: string, apiToken: string): string[];
};
