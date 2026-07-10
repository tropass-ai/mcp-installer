import fs from "node:fs";
import path from "node:path";

import { DEFAULT_LLM_MODEL, DEFAULT_TOKEN_HEADER } from "../constants.js";
import {
  buildInstructionContent,
  MANAGED_INSTRUCTIONS_BEGIN,
  MANAGED_INSTRUCTIONS_END
} from "../instructions.js";
import { expandHome } from "../path-utils.js";
import type { HarnessInstaller } from "./types.js";
import {
  buildBearerToken,
  buildServerConfig,
  readJsonFile,
  readObjectProperty,
  stripBearerToken,
  upsertManagedBlock,
  writeJsonFile
} from "./shared.js";
import { runAgentCli } from "./cli.js";

export const claudeInstaller: HarnessInstaller = {
  installConfig(options, configPath) {
    if (options.configPath) {
      const payload = readJsonFile(configPath);
      payload.mcpServers = {
        ...readObjectProperty(payload, "mcpServers"),
        tropass: {
          type: "http",
          ...buildServerConfig(options.mcpUrl, options.apiToken)
        }
      };
      writeJsonFile(configPath, payload);
      return;
    }

    const projectDir = path.resolve(expandHome(options.projectDir));
    fs.mkdirSync(projectDir, { recursive: true });
    runAgentCli("claude", [
      "mcp",
      "add",
      "tropass",
      options.mcpUrl,
      "--scope",
      options.scope === "global" ? "user" : "project",
      "--transport",
      "http",
      "--header",
      `${DEFAULT_TOKEN_HEADER}: ${buildBearerToken(options.apiToken)}`
    ], projectDir);
  },

  installProvider(options) {
    writeClaudeProvider(resolveClaudeSettingsPath(options), options.apiToken, options.llmUrl);
  },

  installInstructions(options, instructionPath) {
    upsertManagedBlock(
      instructionPath,
      buildInstructionContent(options.client),
      MANAGED_INSTRUCTIONS_BEGIN,
      MANAGED_INSTRUCTIONS_END
    );
  }
};

function resolveClaudeSettingsPath(options: { projectDir: string; scope: string }): string {
  if (options.scope === "global") {
    return path.join(process.env.HOME || process.env.USERPROFILE || "", ".claude", "settings.json");
  }
  return path.join(path.resolve(expandHome(options.projectDir)), ".claude", "settings.json");
}

function writeClaudeProvider(settingsPath: string, apiToken: string, llmUrl: string): void {
  const payload = readJsonFile(settingsPath);
  payload.env = {
    ...readObjectProperty(payload, "env"),
    ANTHROPIC_BASE_URL: llmUrl,
    ANTHROPIC_API_KEY: stripBearerToken(apiToken),
    ANTHROPIC_MODEL: DEFAULT_LLM_MODEL
  };
  writeJsonFile(settingsPath, payload);
}
