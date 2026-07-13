import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const CLIENT_CLI_PACKAGES = {
  claude: "@anthropic-ai/claude-code",
  codex: "@openai/codex",
  opencode: "opencode-ai"
} as const;

type CliClient = keyof typeof CLIENT_CLI_PACKAGES;

type RunAgentCliOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export function runAgentCli(
  client: CliClient,
  args: string[],
  options: RunAgentCliOptions = {}
): void {
  const cwd = options.cwd ?? process.cwd();
  const command = resolveCommand(client);
  const commandArgs = command === "npx" ? ["-y", `${CLIENT_CLI_PACKAGES[client]}@latest`, ...args] : args;
  const result = childProcess.spawnSync(command, commandArgs, {
    cwd,
    env: options.env ? { ...process.env, ...options.env } : process.env,
    encoding: "utf8",
    stdio: "pipe"
  });
  if (result.status === 0) {
    return;
  }

  const errorDetail = result.error?.message
    || (result.stderr || result.stdout || "unknown error").trim();
  throw new Error(`${client} CLI failed: ${errorDetail}`);
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
  return childProcess.spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
}
