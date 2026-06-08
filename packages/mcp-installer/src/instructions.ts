import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {InstallClient} from "./types.js";

export const MANAGED_INSTRUCTIONS_BEGIN =
  "<!-- BEGIN TROPASS MCP INSTRUCTIONS -->";
export const MANAGED_INSTRUCTIONS_END = "<!-- END TROPASS MCP INSTRUCTIONS -->";

const INSTRUCTION_FILE_NAME = "tropass-mcp.md";
const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const INSTRUCTION_TEMPLATE_PATHS = [
  path.resolve(MODULE_DIRECTORY, "../instructions", INSTRUCTION_FILE_NAME),
  path.resolve(MODULE_DIRECTORY, "../../instructions", INSTRUCTION_FILE_NAME)
];

export const TROPASS_MCP_INSTRUCTIONS = readInstructionTemplate();
const CODEX_SKILL_BODY = TROPASS_MCP_INSTRUCTIONS.replace("# Tropass MCP Instructions\n\n", "");

function readInstructionTemplate(): string {
  for (const instructionTemplatePath of INSTRUCTION_TEMPLATE_PATHS) {
    if (fs.existsSync(instructionTemplatePath)) {
      return fs.readFileSync(instructionTemplatePath, "utf8").trimEnd();
    }
  }
  throw new Error(`Tropass MCP instructions file not found: ${INSTRUCTION_TEMPLATE_PATHS.join(", ")}`);
}

export function buildInstructionContent(client: InstallClient): string {
  if (client === "codex") {
    return `---
name: tropass-gateway
description: Use when calling Tropass ML models through the Tropass MCP server, selecting models, preparing model inputs, handling file URL arguments, or interpreting model results.
---

# Tropass Gateway MCP

${CODEX_SKILL_BODY}`;
  }
  if (client === "cursor") {
    return `---
description: Use Tropass MCP for ML model calls
alwaysApply: true
---

${TROPASS_MCP_INSTRUCTIONS}`;
  }
  if (client === "claude") {
    return `${TROPASS_MCP_INSTRUCTIONS}
Add these instructions to your Claude project or custom instructions together with the Tropass MCP server config.
`;
  }
  return TROPASS_MCP_INSTRUCTIONS;
}
