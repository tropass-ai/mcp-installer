import type { ValidatedInstallOptions } from "../types.js";

export type HarnessInstaller = {
  installConfig(options: ValidatedInstallOptions, configPath: string): void;
  installInstructions(options: ValidatedInstallOptions, instructionPath: string): void;
};
