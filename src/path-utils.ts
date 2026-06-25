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

export function resolveClaudeDesktopConfigPath(): string {
  if (process.platform === "darwin") {
    return path.join(process.env.HOME || "", "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Roaming");
    return path.join(appData, "Claude", "claude_desktop_config.json");
  }
  return path.join(process.env.HOME || "", ".config", "Claude", "claude_desktop_config.json");
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
    return path.join(appData, "opencode", "mcp.json");
  }
  return path.join(home, ".config", "opencode", "mcp.json");
}

export function resolveOpenCodeInstructionPath(): string {
  return path.join(path.dirname(resolveOpenCodeConfigPath()), "AGENTS.md");
}
