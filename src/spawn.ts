import childProcess from "node:child_process";
import process from "node:process";

export type SpawnResult = childProcess.SpawnSyncReturns<string>;

export function commandExists(command: string, args: string[] = ["--version"]): boolean {
  return childProcess.spawnSync(command, args, { stdio: "ignore" }).status === 0;
}

export function describeSpawnFailure(result: SpawnResult): string {
  return result.error?.message
    || (result.stderr || result.stdout || "неизвестная ошибка").trim();
}

export function windowsExecutable(name: string): string {
  return process.platform === "win32" ? `${name}.exe` : name;
}
