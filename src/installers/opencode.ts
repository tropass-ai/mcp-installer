import fs from "node:fs";

import {DEFAULT_LLM_MODEL, DEFAULT_TOKEN_HEADER} from "../constants.js";
import {
  buildInstructionContent,
  MANAGED_INSTRUCTIONS_BEGIN,
  MANAGED_INSTRUCTIONS_END,
} from "../instructions.js";
import type {HarnessInstaller} from "./types.js";
import {
  buildBearerToken,
  readJsonFile,
  readObjectProperty,
  stripBearerToken,
  upsertManagedBlock,
  writeJsonFile,
} from "./shared.js";
import {runAgentCli} from "./cli.js";

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
        `${DEFAULT_TOKEN_HEADER}=${buildBearerToken(options.apiToken)}`,
      ]);
      if (fs.existsSync(configPath)) {
        return;
      }
      writeOpenCodeConfig(configPath, options.mcpUrl, options.apiToken);
      return;
    }

    writeOpenCodeConfig(configPath, options.mcpUrl, options.apiToken);
  },

  installProvider(options, configPath) {
    writeOpenCodeProvider(configPath, options.apiToken, options.llmUrl);
  },

  installInstructions(options, instructionPath) {
    upsertManagedBlock(
      instructionPath,
      buildInstructionContent(options.client),
      MANAGED_INSTRUCTIONS_BEGIN,
      MANAGED_INSTRUCTIONS_END,
    );
  },
};

function writeOpenCodeConfig(
  configPath: string,
  mcpUrl: string,
  apiToken: string,
): void {
  const payload = readJsonFile(configPath);
  payload.mcp = {
    ...readObjectProperty(payload, "mcp"),
    tropass: {
      type: "remote",
      enabled: true,
      url: mcpUrl,
      headers: {
        [DEFAULT_TOKEN_HEADER]: buildBearerToken(apiToken),
      },
    },
  };
  writeJsonFile(configPath, payload);
}

function writeOpenCodeProvider(
  configPath: string,
  apiToken: string,
  llmUrl: string,
): void {
  const payload = readJsonFile(configPath);
  payload.model = `tropass/${DEFAULT_LLM_MODEL}`;
  payload.provider = {
    ...readObjectProperty(payload, "provider"),
    tropass: {
      npm: "@ai-sdk/openai-compatible",
      name: "Tropass",
      options: {
        baseURL: `${llmUrl}/v1`,
        apiKey: stripBearerToken(apiToken),
      },
      models: {
        [DEFAULT_LLM_MODEL]: {
          name: DEFAULT_LLM_MODEL,
        },
      },
    },
  };
  writeJsonFile(configPath, payload);
}
