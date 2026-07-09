import { buildInstructionContent } from "../instructions.js";
import type { HarnessInstaller } from "./types.js";
import { buildServerConfig, readJsonFile, readObjectProperty, writeJsonFile, writeTextFile } from "./shared.js";

export const cursorInstaller: HarnessInstaller = {
  installConfig(options, configPath) {
    const payload = readJsonFile(configPath);
    payload.mcpServers = {
      ...readObjectProperty(payload, "mcpServers"),
      tropass: buildServerConfig(options.mcpUrl, options.apiToken)
    };
    writeJsonFile(configPath, payload);
  },

  installInstructions(options, instructionPath) {
    writeTextFile(instructionPath, buildInstructionContent(options.client));
  }
};
