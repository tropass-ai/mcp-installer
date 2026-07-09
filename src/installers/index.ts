import type { InstallClient } from "../types.js";
import type { HarnessInstaller } from "./types.js";
import { claudeInstaller } from "./claude.js";
import { codexInstaller } from "./codex.js";
import { opencodeInstaller } from "./opencode.js";

export function resolveHarnessInstaller(client: InstallClient): HarnessInstaller {
  if (client === "codex") {
    return codexInstaller;
  }
  if (client === "claude") {
    return claudeInstaller;
  }
  if (client === "opencode") {
    return opencodeInstaller;
  }
  throw new Error(`Unsupported client '${client}'.`);
}
