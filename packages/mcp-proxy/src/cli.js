import path from "node:path";
import process from "node:process";

import { runInstall } from "./installer.js";
import { logError } from "./logging.js";
import { runProxy } from "./proxy.js";

export async function main() {
  if (shouldRunInstaller()) {
    const installArgs = process.argv[2] === "install" ? process.argv.slice(3) : process.argv.slice(2);
    try {
      await runInstall(installArgs);
    } catch (error) {
      logError("install failed", error);
      process.exit(1);
    }
    return;
  }

  await runProxy();
}

function shouldRunInstaller() {
  const executableName = path.basename(process.argv[1] || "");
  return process.argv[2] === "install" || executableName.includes("install");
}

