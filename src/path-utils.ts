import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export function expandHome(filePath: string): string {
  if (filePath === "~") {
    return process.env.HOME || process.env.USERPROFILE || os.homedir();
  }
  if (filePath.startsWith("~/")) {
    const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
    return path.join(home, filePath.slice(2));
  }
  return filePath;
}

export function resolveOpenCodeConfigDir(): string {
  if (process.env.OPENCODE_CONFIG_DIR) {
    return path.resolve(expandHome(process.env.OPENCODE_CONFIG_DIR));
  }

  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  const xdgConfigHome = process.env.XDG_CONFIG_HOME
    ? path.resolve(expandHome(process.env.XDG_CONFIG_HOME))
    : path.join(home, ".config");
  return path.join(xdgConfigHome, "opencode");
}

export function resolveOpenCodeConfigPath(): string {
  if (process.env.OPENCODE_CONFIG) {
    return path.resolve(expandHome(process.env.OPENCODE_CONFIG));
  }

  const configDir = resolveOpenCodeConfigDir();
  const jsonPath = path.join(configDir, "opencode.json");
  const jsoncPath = path.join(configDir, "opencode.jsonc");

  if (fs.existsSync(jsonPath) && !fs.existsSync(jsoncPath)) {
    return jsonPath;
  }
  if (fs.existsSync(jsoncPath) && !fs.existsSync(jsonPath)) {
    return jsoncPath;
  }
  if (fs.existsSync(jsonPath) && fs.existsSync(jsoncPath)) {
    return jsonPath;
  }

  return jsoncPath;
}
