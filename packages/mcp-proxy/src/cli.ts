import process from "node:process";

import { Command } from "commander";

import { runInstall } from "./installer.js";
import { logError } from "./logging.js";
import { runProxy } from "./proxy.js";
import type { RawInstallOptions } from "./types.js";

export async function main(): Promise<void> {
  const executableName = process.argv[1] || "";
  if (executableName.includes("tropass-mcp-install")) {
    await runInstallCommand(process.argv.slice(2), "tropass-mcp-install");
    return;
  }

  const args = process.argv.slice(2);
  if (args[0] === "install") {
    await runInstallCommand(args.slice(1), "tropass-mcp-proxy install");
    return;
  }

  if (args.includes("--help") || args.includes("-h")) {
    createRootCommand().outputHelp();
    return;
  }

  if (args.length > 0) {
    createRootCommand().parse(args, { from: "user" });
    return;
  }

  await runProxy();
}

async function runInstallCommand(args: string[], commandName: string): Promise<void> {
  const command = createInstallCommand(commandName);
  try {
    await command.parseAsync(args, { from: "user" });
  } catch (error) {
    logError("install failed", error);
    process.exit(1);
  }
}

function createRootCommand(): Command {
  return new Command()
    .name("tropass-mcp-proxy")
    .description("stdio MCP proxy for connecting agents to the Tropass remote MCP gateway.")
    .usage("[install] [options]")
    .addHelpText("after", `

Run without arguments to start the stdio MCP proxy runtime.
Run "tropass-mcp-proxy install" to write agent MCP config and instructions.`);
}

function createInstallCommand(commandName: string): Command {
  return new Command()
    .name(commandName)
    .description("Install Tropass MCP config and agent instructions.")
    .argument("[client]", "MCP client: cursor, vscode, claude, or generic")
    .option("--config <path>", "explicit path to the MCP config file")
    .option("--url <url>", "Tropass MCP endpoint URL")
    .option("--token <token>", "Tropass API token")
    .option("--project <dir>", "project/workspace directory for project-local configs")
    .option("-y, --yes", "accept defaults for non-secret prompts")
    .action(async (client: string | undefined, options: RawInstallOptions) => {
      await runInstall({ ...options, client });
    });
}
