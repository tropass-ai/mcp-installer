import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { DEFAULT_LLM_MODEL, DEFAULT_TOKEN_HEADER, LLM_GATEWAY_URL } from "../constants.js";
import { buildSkillContents } from "../instructions.js";
import type { HarnessInstaller } from "./types.js";
import {
  buildBearerToken,
  stripBearerToken,
  stringifyTomlKey,
  stringifyTomlValue,
  TOOL_TIMEOUT_SECONDS,
  writeTextFile
} from "./shared.js";

const CODEX_TOKEN_ENV_VAR = "TROPASS_API_TOKEN";
const TROPASS_LLM_PROVIDER_BEGIN = "# BEGIN TROPASS LLM PROVIDER";
const TROPASS_LLM_PROVIDER_END = "# END TROPASS LLM PROVIDER";

export const codexInstaller: HarnessInstaller = {
  installConfig(options, configPath) {
    if (path.basename(configPath) !== "config.toml") {
      throw new Error("Codex config path must end with config.toml.");
    }

    const codexHome = path.dirname(configPath);
    fs.mkdirSync(codexHome, { recursive: true });
    runCodexMcpAdd(codexHome, options.mcpUrl);
    writeCodexToken(configPath, options.apiToken);
  },

  installProvider(options, configPath) {
    writeCodexProvider(configPath, options.apiToken);
  },

  installInstructions(_options, primaryInstructionPath) {
    const skillsPath = path.dirname(path.dirname(primaryInstructionPath));
    for (const skillContent of buildSkillContents()) {
      writeTextFile(path.join(skillsPath, skillContent.name, "SKILL.md"), skillContent.content);
    }
  }
};

function runCodexMcpAdd(codexHome: string, mcpUrl: string): void {
  childProcess.execFileSync(
    "codex",
    ["mcp", "add", "tropass", "--url", mcpUrl, "--bearer-token-env-var", CODEX_TOKEN_ENV_VAR],
    {
      env: {
        ...process.env,
        CODEX_HOME: codexHome
      },
      stdio: "ignore"
    }
  );
}

function writeCodexProvider(configPath: string, apiToken: string): void {
  const config = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  const content = removeManagedBlock(config, TROPASS_LLM_PROVIDER_BEGIN, TROPASS_LLM_PROVIDER_END);
  const lines = content.trimEnd().split("\n");
  const firstTableIndex = lines.findIndex((line) => line.trimStart().startsWith("["));
  const rootLines = firstTableIndex === -1 ? lines : lines.slice(0, firstTableIndex);
  const tableLines = firstTableIndex === -1 ? [] : lines.slice(firstTableIndex);
  const rootContent = [
    ...rootLines.filter((line) => !/^\s*(model|model_provider)\s*=/.test(line)),
    `model = ${stringifyTomlValue(DEFAULT_LLM_MODEL)}`,
    `model_provider = ${stringifyTomlValue("tropass")}`
  ].join("\n").trim();
  const providerBlock = [
    TROPASS_LLM_PROVIDER_BEGIN,
    "[model_providers.tropass]",
    `provider = ${stringifyTomlValue("openai")}`,
    `name = ${stringifyTomlValue("Tropass")}`,
    `base_url = ${stringifyTomlValue(`${LLM_GATEWAY_URL}/v1`)}`,
    `wire_api = ${stringifyTomlValue("responses")}`,
    `experimental_bearer_token = ${stringifyTomlValue(stripBearerToken(apiToken))}`,
    TROPASS_LLM_PROVIDER_END
  ].join("\n");

  writeTextFile(configPath, [rootContent, tableLines.join("\n").trim(), providerBlock].filter(Boolean).join("\n\n"));
}

function removeManagedBlock(content: string, begin: string, end: string): string {
  const startIndex = content.indexOf(begin);
  const endIndex = content.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return content;
  }
  return `${content.slice(0, startIndex).trimEnd()}\n\n${content.slice(endIndex + end.length).trimStart()}`;
}

function writeCodexToken(configPath: string, apiToken: string): void {
  const placeholder = `bearer_token_env_var = ${stringifyTomlValue(CODEX_TOKEN_ENV_VAR)}`;
  const config = fs.readFileSync(configPath, "utf8");

  if (!config.includes(placeholder)) {
    throw new Error("Codex config did not contain the expected bearer token placeholder.");
  }

  writeTextFile(
    configPath,
    config.replace(
      placeholder,
      [
        `http_headers = { ${stringifyTomlKey(DEFAULT_TOKEN_HEADER)} = ${stringifyTomlValue(buildBearerToken(apiToken))} }`,
        `tool_timeout_sec = ${TOOL_TIMEOUT_SECONDS}`
      ].join("\n")
    )
  );
}
