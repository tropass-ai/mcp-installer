import fs from "node:fs";

import { DEFAULT_TOKEN_HEADER } from "../constants.js";
import {
  buildInstructionContent,
  MANAGED_INSTRUCTIONS_BEGIN,
  MANAGED_INSTRUCTIONS_END
} from "../instructions.js";
import type { HarnessInstaller } from "./types.js";
import {
  buildBearerToken,
  readJsonFile,
  readObjectProperty,
  upsertManagedBlock,
  writeJsonFile
} from "./shared.js";
import { runAgentCli } from "./cli.js";

export const opencodeInstaller: HarnessInstaller = {
  installConfig(options, configPath) {
    if (options.scope === "global" && !options.configPath) {
      runAgentCli("opencode", [
        "mcp",
        "add",
        "tropass",
        "--url",
        options.mcpUrl,
        "--header",
        `${DEFAULT_TOKEN_HEADER}=${buildBearerToken(options.apiToken)}`
      ]);
      if (fs.existsSync(configPath)) {
        return;
      }
      writeOpenCodeConfig(configPath, options.mcpUrl, options.apiToken);
      return;
    }

    writeOpenCodeConfig(configPath, options.mcpUrl, options.apiToken);
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

function writeOpenCodeConfig(configPath: string, mcpUrl: string, apiToken: string): void {
  const payload = readJsonFile(configPath);
  payload.mcp = {
    ...readObjectProperty(payload, "mcp"),
    tropass: {
      type: "remote",
      enabled: true,
      url: mcpUrl,
      headers: {
        [DEFAULT_TOKEN_HEADER]: buildBearerToken(apiToken)
      }
    }
  };
  writeJsonFile(configPath, payload);
}
