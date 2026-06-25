import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {InstallClient} from "./types.js";

export const MANAGED_INSTRUCTIONS_BEGIN =
  "<!-- BEGIN TROPASS MCP INSTRUCTIONS -->";
export const MANAGED_INSTRUCTIONS_END = "<!-- END TROPASS MCP INSTRUCTIONS -->";

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const INSTRUCTION_DIRECTORIES = [
  path.resolve(MODULE_DIRECTORY, "../instructions"),
  path.resolve(MODULE_DIRECTORY, "../../instructions")
];

type InstructionTemplate = {
  fileName: string;
  templateTitle: string;
  description: string;
};

type SkillDefinition = InstructionTemplate & {
  name: string;
  skillTitle: string;
  skillDescription: string;
};

const TROPASS_MCP_TEMPLATE: InstructionTemplate = {
  fileName: "tropass-mcp.md",
  templateTitle: "Tropass MCP Instructions",
  description: "Tropass MCP instructions"
};

const TROPASS_GATEWAY_SKILL: SkillDefinition = {
  ...TROPASS_MCP_TEMPLATE,
  name: "tropass-gateway",
  skillTitle: "Tropass Gateway MCP",
  skillDescription:
    "Use when calling Tropass ML models through the Tropass MCP server, selecting models, preparing model inputs, handling file URL arguments, or interpreting model results."
};

const AGENT_RESPONSE_DISPLAY_SKILL: SkillDefinition = {
  fileName: "agent-response-display.md",
  name: "agent-response-display",
  templateTitle: "Agent Response Display",
  skillTitle: "Agent Response Display",
  description: "agent response display instructions",
  skillDescription:
    "Interpret Tropass MCP/ML agent response schemas for UI display. Use when parsing, validating, rendering, transforming, debugging, or designing frontend/backend handling for AgentResponse, AgentPanelOutput, AgentPrimaryData, AgentPlotData, descriptions, media, attachments, panel ordering, chart data, or streamed panel results."
};

const TROPASS_SKILLS: SkillDefinition[] = [
  TROPASS_GATEWAY_SKILL,
  AGENT_RESPONSE_DISPLAY_SKILL
];

export const TROPASS_MCP_INSTRUCTIONS = readInstructionTemplate(TROPASS_MCP_TEMPLATE);
export const AGENT_RESPONSE_DISPLAY_INSTRUCTIONS = readInstructionTemplate(AGENT_RESPONSE_DISPLAY_SKILL);

export type SkillContent = {
  name: string;
  content: string;
};

export function buildSkillContents(): SkillContent[] {
  return TROPASS_SKILLS.map((skillDefinition) => ({
    name: skillDefinition.name,
    content: buildSkillContent(skillDefinition)
  }));
}

export function buildInstructionContent(client: InstallClient): string {
  if (client === "codex") {
    return buildSkillContent(TROPASS_GATEWAY_SKILL);
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
  if (client === "opencode") {
    return `${TROPASS_MCP_INSTRUCTIONS}
Use these instructions with OpenCode together with the Tropass MCP server config.
`;
  }
  return TROPASS_MCP_INSTRUCTIONS;
}

function buildSkillContent(skillDefinition: SkillDefinition): string {
  const templateContent = readInstructionTemplate(skillDefinition);
  const skillBody = stripMarkdownTitle(templateContent, skillDefinition.templateTitle);

  return `---
name: ${skillDefinition.name}
description: ${skillDefinition.skillDescription}
---

# ${skillDefinition.skillTitle}

${skillBody}`;
}

function readInstructionTemplate(templateDefinition: InstructionTemplate): string {
  const candidatePaths = INSTRUCTION_DIRECTORIES.map((directoryPath) =>
    path.join(directoryPath, templateDefinition.fileName)
  );

  for (const instructionTemplatePath of candidatePaths) {
    if (fs.existsSync(instructionTemplatePath)) {
      return fs.readFileSync(instructionTemplatePath, "utf8").trimEnd();
    }
  }

  throw new Error(`${templateDefinition.description} file not found: ${candidatePaths.join(", ")}`);
}

function stripMarkdownTitle(content: string, title: string): string {
  return content.replace(`# ${title}\n\n`, "");
}
