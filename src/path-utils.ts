import path from "node:path";
import process from "node:process";

export function expandHome(filePath: string): string {
  if (filePath === "~") {
    return process.env.HOME || process.env.USERPROFILE || filePath;
  }
  if (filePath.startsWith("~/")) {
    const home = process.env.HOME || process.env.USERPROFILE;
    return home ? path.join(home, filePath.slice(2)) : filePath;
  }
  return filePath;
}

export function resolveClaudeCodeConfigPath(): string {
  return path.join(process.env.HOME || process.env.USERPROFILE || "", ".claude.json");
}

export function resolveClaudeCodeInstructionPath(): string {
  return path.join(process.env.HOME || process.env.USERPROFILE || "", ".claude", "CLAUDE.md");
}

export function resolveCodexConfigPath(): string {
  return path.join(process.env.HOME || process.env.USERPROFILE || "", ".codex", "config.toml");
}

export function resolveCodexSkillsPath(): string {
  return path.join(process.env.HOME || process.env.USERPROFILE || "", ".codex", "skills");
}

export function resolveCursorConfigPath(): string {
  return path.join(process.env.HOME || process.env.USERPROFILE || "", ".cursor", "mcp.json");
}

export function resolveCursorRulesPath(): string {
  return path.join(process.env.HOME || process.env.USERPROFILE || "", ".cursor", "rules");
}

export function resolveOpenCodeConfigPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.join(appData, "opencode", "opencode.jsonc");
  }
  return path.join(home, ".config", "opencode", "opencode.jsonc");
}

export function resolveOpenCodeInstructionPath(): string {
  return path.join(path.dirname(resolveOpenCodeConfigPath()), "AGENTS.md");
}
