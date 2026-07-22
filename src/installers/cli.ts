import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

type RunAgentCliOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export function runAgentCli(
  args: string[],
  options: RunAgentCliOptions = {}
): void {
  const cwd = options.cwd ?? process.cwd();
  const { command, commandArgs } = resolveCommand(args);
  const result = childProcess.spawnSync(command, commandArgs, {
    cwd,
    env: options.env ? { ...process.env, ...options.env } : process.env,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status === 0) {
    return;
  }

  const errorDetail = result.error?.message
    || (result.stderr || result.stdout || "неизвестная ошибка").trim();
  throw new Error(`Ошибка opencode CLI: ${errorDetail}`);
}

function resolveCommand(args: string[]): { command: string; commandArgs: string[] } {
  if (commandExists("opencode")) {
    return { command: "opencode", commandArgs: args };
  }

  const localCommand = path.resolve(
    "node_modules",
    ".bin",
    process.platform === "win32" ? "opencode.cmd" : "opencode",
  );
  if (fs.existsSync(localCommand) && process.platform !== "win32") {
    return { command: localCommand, commandArgs: args };
  }

  if (process.platform === "win32") {
    const npxCli = path.join(
      path.dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npx-cli.js",
    );
    if (!fs.existsSync(npxCli)) {
      throw new Error(`Не найден npx-cli.js: ${npxCli}`);
    }
    return {
      command: process.execPath,
      commandArgs: [npxCli, "-y", "opencode-ai@latest", ...args],
    };
  }

  return { command: "npx", commandArgs: ["-y", "opencode-ai@latest", ...args] };
}

function commandExists(command: string): boolean {
  return childProcess.spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
}
