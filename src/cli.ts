import process from "node:process";

import { Command, CommanderError } from "commander";

import { TROPASS_URL } from "./constants.js";
import { runInstall } from "./installer.js";
import { logError } from "./logging.js";
import type { RawInstallOptions } from "./types.js";

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  await runInstallCommand(args[0] === "install" ? args.slice(1) : args, "tropass-mcp-install");
}

async function runInstallCommand(args: string[], commandName: string): Promise<void> {
  const command = createInstallCommand(commandName).exitOverride();
  try {
    await command.parseAsync(args, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError && error.exitCode === 0) {
      return;
    }
    logError("install failed", error);
    process.exit(1);
  }
}

function createInstallCommand(commandName: string): Command {
  return new Command()
    .name(commandName)
    .description(`Install direct remote Tropass MCP config and agent instructions.\nTropass: ${TROPASS_URL}`)
    .argument("[client]", "MCP client: codex, cursor, claude, or opencode")
    .option("--config <path>", "explicit path to the MCP config file")
    .option("--url <url>", "Tropass MCP endpoint URL")
    .option("--token <token>", "Tropass API token")
    .option("--scope <scope>", "install scope: project or global")
    .option("--global", "install into global user config")
    .option("--local", "install into project/workspace config")
    .option("--project <dir>", "project/workspace directory for project-local configs")
    .option("-y, --yes", "accept defaults for non-secret prompts")
    .action(async (client: string | undefined, options: RawInstallOptions) => {
      const rawOptions: RawInstallOptions = { ...options };
      if (client !== undefined) {
        rawOptions.client = client;
      }
      await runInstall(rawOptions);
    });
}
