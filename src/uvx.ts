import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import {commandExists, windowsExecutable} from "./spawn.js";

// Абсолютный путь важнее найденного в PATH: PATH установщика и PATH процесса
// OpenCode (запуск из GUI, из IDE) — разные, а uvx обычно лежит в ~/.local/bin.
export function findUvx(): string | undefined {
  const absolutePath = uvxCandidatePaths()
    .find((candidate) => fs.existsSync(candidate) && commandExists(candidate));
  if (absolutePath) {
    return absolutePath;
  }

  return commandExists(uvxExecutable()) ? uvxExecutable() : undefined;
}

export function uvxExecutable(): string {
  return windowsExecutable("uvx");
}

function uvxCandidatePaths(): string[] {
  const executable = uvxExecutable();
  const home = os.homedir();
  return [
    path.join(home, ".local", "bin", executable),
    path.join(home, ".cargo", "bin", executable),
    ...(process.platform === "win32"
      ? [
        path.join(home, "AppData", "Roaming", "uv", "bin", executable),
        path.join(home, "AppData", "Local", "uv", "bin", executable),
      ]
      : ["/opt/homebrew/bin/uvx", "/usr/local/bin/uvx"]),
  ];
}
