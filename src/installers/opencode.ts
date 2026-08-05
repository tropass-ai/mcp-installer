import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {
  DEFAULT_LLM_MODEL,
  DEFAULT_TOKEN_HEADER,
  LLM_MODELS,
  MCP_MODEL_CALL_VERSION_HEADER,
  MCP_MODEL_CALL_VERSION_VALUE,
} from "../constants.js";
import type {HarnessInstaller} from "./types.js";
import {
  buildBearerToken,
  readJsonFile,
  readObjectProperty,
  stripBearerToken,
  writeJsonFile,
  writeTextFile,
} from "./shared.js";
import {runAgentCli} from "./cli.js";

const PACKAGED_SKILLS_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../skills",
);
const PACKAGED_TOOLS_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../tools",
);
const SKILL_NAMES = ["tropass-gateway", "agent-response-display"];
const TOOL_FILE_NAME = "wait_for_model_task.ts";
const TOOL_SCRIPT_NAME = "wait_for_model_task.py";

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
        "--header",
        `${MCP_MODEL_CALL_VERSION_HEADER}=${MCP_MODEL_CALL_VERSION_VALUE}`,
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
    return SKILL_NAMES.map((name) => {
      const relativePath = path.join(name, "SKILL.md");
      const skillPath = path.join(skillsPath, relativePath);
      writeTextFile(
        skillPath,
        fs.readFileSync(path.join(PACKAGED_SKILLS_DIRECTORY, relativePath), "utf8"),
      );
      return skillPath;
    });
  },

  installTools(toolsPath, mcpUrl, apiToken) {
    fs.mkdirSync(toolsPath, { recursive: true });
    const gatewayUrl = buildGatewayUrl(mcpUrl);
    const toolTemplate = fs.readFileSync(path.join(PACKAGED_TOOLS_DIRECTORY, TOOL_FILE_NAME), "utf8");
    const toolPath = path.join(toolsPath, TOOL_FILE_NAME);
    writeTextFile(
      toolPath,
      toolTemplate
        .replace("{{GATEWAY_URL}}", gatewayUrl)
        .replace("{{GATEWAY_API_TOKEN}}", stripBearerToken(apiToken)),
    );
    const scriptPath = path.join(toolsPath, TOOL_SCRIPT_NAME);
    writeTextFile(
      scriptPath,
      fs.readFileSync(path.join(PACKAGED_TOOLS_DIRECTORY, TOOL_SCRIPT_NAME), "utf8"),
    );
    return [toolPath, scriptPath];
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
        [MCP_MODEL_CALL_VERSION_HEADER]: MCP_MODEL_CALL_VERSION_VALUE,
      },
    },
  };
  writeJsonFile(configPath, payload);
}

function writeOpenCodeProvider(
  configPath: string,
  apiToken: string,
  llmUrl: string,
): void {  const payload = readJsonFile(configPath);
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
        LLM_MODELS.map((model) => [
          model,
          {
            name: model,
            ...(model === DEFAULT_LLM_MODEL && {
              modalities: {input: ["text", "image"], output: ["text"]},
            }),
          },
        ]),
      ),
    },
  };
  writeJsonFile(configPath, payload);
}

function buildGatewayUrl(mcpUrl: string): string {
  return mcpUrl.replace(/\/mcp$/, "").replace(/\/+$/, "");
}
