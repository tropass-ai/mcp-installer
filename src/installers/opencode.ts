import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {
  DEFAULT_LLM_MODEL,
  DEFAULT_TOKEN_HEADER,
  LLM_MODELS,
} from "../constants.js";
import type {HarnessInstaller} from "./types.js";
import {
  buildBearerToken,
  readJsonFile,
  readObjectProperty,
  stripBearerToken,
  writeJsonFile,
} from "./shared.js";
import {runAgentCli} from "./cli.js";

const PACKAGED_SKILLS_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../skills",
);
const SKILL_NAMES = ["tropass-gateway", "agent-response-display"];

export const opencodeInstaller: HarnessInstaller = {
  installConfig(options, configPath) {
    if (options.scope === "global" && !options.configPath) {
      runAgentCli([
        "mcp",
        "add",
        "tropass",
        "--url",
        options.mcpUrl,
        "--header",
        `${DEFAULT_TOKEN_HEADER}=${buildBearerToken(options.apiToken)}`,
      ]);
      writeOpenCodeConfig(configPath, options.mcpUrl, options.apiToken);
      return;
    }

    writeOpenCodeConfig(configPath, options.mcpUrl, options.apiToken);
  },

  installProvider(options, configPath) {
    writeOpenCodeProvider(configPath, options.apiToken, options.llmUrl);
  },

  installSkills(skillsPath) {
    fs.cpSync(PACKAGED_SKILLS_DIRECTORY, skillsPath, {recursive: true, force: true});
    return SKILL_NAMES.map((name) => path.join(skillsPath, name, "SKILL.md"));
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
      timeout: 30 * 60 * 1000,
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
      models: Object.fromEntries(
        LLM_MODELS.map((model) => [model, {name: model}]),
      ),
    },
  };
  writeJsonFile(configPath, payload);
}
