import process from "node:process";

import { Command, CommanderError, Help } from "commander";

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
    logError("ошибка установки", error);
    process.exit(1);
  }
}

function createInstallCommand(commandName: string): Command {
  return new Command()
    .name(commandName)
    .description(`Настраивает удалённый MCP-сервер Tropass и инструкции агента.\nTropass: ${TROPASS_URL}`)
    .argument("[client]", "MCP-клиент: opencode")
    .option("--config <path>", "путь к файлу конфигурации MCP")
    .option("--url <url>", "базовый URL шлюза моделей Tropass")
    .option("--llm-url <url>", "URL LLM-шлюза Tropass")
    .option("--token <token>", "API-токен Tropass")
    .option("--scope <scope>", "область установки: global или project")
    .option("--global", "установить для текущего пользователя")
    .option("--local", "установить для текущего проекта")
    .option("--project <dir>", "каталог проекта для локальной конфигурации")
    .option("-y, --yes", "принять значения по умолчанию, кроме токена")
    .helpOption("-h, --help", "показать справку")
    .configureHelp({
      formatHelp: (command, helper) => new Help().formatHelp(command, helper)
        .replace("Usage:", "Использование:")
        .replace("Arguments:", "Аргументы:")
        .replace("Options:", "Параметры:")
    })
    .action(async (client: string | undefined, options: RawInstallOptions) => {
      const rawOptions: RawInstallOptions = { ...options };
      if (client !== undefined) {
        rawOptions.client = client;
      }
      await runInstall(rawOptions);
    });
}
