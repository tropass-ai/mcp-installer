import fs from "node:fs";
import path from "node:path";

import { DEFAULT_TOKEN_HEADER } from "../constants.js";
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

  installInstructions(options, instructionPath) {
    upsertManagedBlock(
      instructionPath,
      buildInstructionContent(options.client),
      MANAGED_INSTRUCTIONS_BEGIN,
      MANAGED_INSTRUCTIONS_END
    );
  }
};
