import path from "node:path";
import process from "node:process";

export function expandHome(filePath) {
  if (filePath === "~") {
    return process.env.HOME || process.env.USERPROFILE || filePath;
  }
  if (filePath.startsWith("~/")) {
    const home = process.env.HOME || process.env.USERPROFILE;
    return home ? path.join(home, filePath.slice(2)) : filePath;
  }
  return filePath;
}

export function resolveClaudeDesktopConfigPath() {
  if (process.platform === "darwin") {
    return path.join(process.env.HOME || "", "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Roaming");
    return path.join(appData, "Claude", "claude_desktop_config.json");
  }
  return path.join(process.env.HOME || "", ".config", "Claude", "claude_desktop_config.json");
}

