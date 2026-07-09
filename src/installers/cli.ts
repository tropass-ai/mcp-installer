import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const CLIENT_CLI_PACKAGES = {
  claude: "@anthropic-ai/claude-code",
  opencode: "opencode-ai"
} as const;

type CliClient = keyof typeof CLIENT_CLI_PACKAGES;

export function runAgentCli(client: CliClient, args: string[], cwd = process.cwd()): void {
  const command = resolveCommand(client);
  const commandArgs = command === "npx" ? ["-y", `${CLIENT_CLI_PACKAGES[client]}@latest`, ...args] : args;
  const result = spawnSync(command, commandArgs, { cwd, encoding: "utf8", stdio: "pipe" });
  if (result.status === 0) {
    return;
  }
  throw new Error(`${client} CLI failed: ${(result.stderr || result.stdout || "unknown error").trim()}`);
}

function resolveCommand(command: CliClient): string {
  if (commandExists(command)) {
    return command;
  }

  const localCommand = path.resolve("node_modules", ".bin", process.platform === "win32" ? `${command}.cmd` : command);
  if (fs.existsSync(localCommand)) {
    return localCommand;
  }

  return "npx";
}

function commandExists(command: string): boolean {
  return spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
}
