import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { DEFAULT_TOKEN_HEADER } from "../constants.js";
import { buildSkillContents } from "../instructions.js";
import type { HarnessInstaller } from "./types.js";
import {
  buildBearerToken,
  stringifyTomlKey,
  stringifyTomlValue,
  TOOL_TIMEOUT_SECONDS,
  writeTextFile
} from "./shared.js";

const CODEX_TOKEN_ENV_VAR = "TROPASS_API_TOKEN";

export const codexInstaller: HarnessInstaller = {
  installConfig(options, configPath) {
    if (path.basename(configPath) !== "config.toml") {
      throw new Error("Codex config path must end with config.toml.");
    }

    const codexHome = path.dirname(configPath);
    fs.mkdirSync(codexHome, { recursive: true });
    childProcess.execFileSync(
      "codex",
      ["mcp", "add", "tropass", "--url", options.mcpUrl, "--bearer-token-env-var", CODEX_TOKEN_ENV_VAR],
      {
        env: {
          ...process.env,
          CODEX_HOME: codexHome
        },
        stdio: "ignore"
      }
    );

    const config = fs.readFileSync(configPath, "utf8").replace(
      `bearer_token_env_var = ${stringifyTomlValue(CODEX_TOKEN_ENV_VAR)}`,
      [
        `http_headers = { ${stringifyTomlKey(DEFAULT_TOKEN_HEADER)} = ${stringifyTomlValue(buildBearerToken(options.apiToken))} }`,
        `tool_timeout_sec = ${TOOL_TIMEOUT_SECONDS}`
      ].join("\n")
    );
    writeTextFile(configPath, config);
  },

  installInstructions(_options, primaryInstructionPath) {
    const skillsPath = path.dirname(path.dirname(primaryInstructionPath));
    for (const skillContent of buildSkillContents()) {
      writeTextFile(path.join(skillsPath, skillContent.name, "SKILL.md"), skillContent.content);
    }
  }
};
