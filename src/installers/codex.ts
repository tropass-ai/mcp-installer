import fs from "node:fs";
import path from "node:path";

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

const MANAGED_CODEX_CONFIG_BEGIN = "# BEGIN TROPASS MCP CONFIG";
const MANAGED_CODEX_CONFIG_END = "# END TROPASS MCP CONFIG";

export const codexInstaller: HarnessInstaller = {
  installConfig(options, configPath) {
    const managedBlock = [
      MANAGED_CODEX_CONFIG_BEGIN,
      "[mcp_servers.tropass]",
      `url = ${stringifyTomlValue(options.mcpUrl)}`,
      `http_headers = { ${stringifyTomlKey(DEFAULT_TOKEN_HEADER)} = ${stringifyTomlValue(buildBearerToken(options.apiToken))} }`,
      `tool_timeout_sec = ${TOOL_TIMEOUT_SECONDS}`,
      MANAGED_CODEX_CONFIG_END
    ].join("\n");

    if (!fs.existsSync(configPath)) {
      writeTextFile(configPath, managedBlock);
      return;
    }

    const existingContent = fs.readFileSync(configPath, "utf8");
    const startIndex = existingContent.indexOf(MANAGED_CODEX_CONFIG_BEGIN);
    const endIndex = existingContent.indexOf(MANAGED_CODEX_CONFIG_END);

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const before = existingContent.slice(0, startIndex).trimEnd();
      const after = existingContent.slice(endIndex + MANAGED_CODEX_CONFIG_END.length).trimStart();
      writeTextFile(configPath, [before, managedBlock, after].filter(Boolean).join("\n\n"));
      return;
    }

    writeTextFile(configPath, `${existingContent.trimEnd()}\n\n${managedBlock}\n`);
  },

  installInstructions(_options, primaryInstructionPath) {
    const skillsPath = path.dirname(path.dirname(primaryInstructionPath));
    for (const skillContent of buildSkillContents()) {
      writeTextFile(path.join(skillsPath, skillContent.name, "SKILL.md"), skillContent.content);
    }
  }
};
