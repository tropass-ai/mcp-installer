import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { tool } from "@opencode-ai/plugin";

const GATEWAY_URL = "{{GATEWAY_URL}}";
const GATEWAY_API_TOKEN = "{{GATEWAY_API_TOKEN}}";
const UVX_COMMAND = "{{UVX_COMMAND}}";

const execFile = promisify(childProcess.execFile);

const TOOL_DIRECTORY = resolveToolDirectory();

export default tool({
  description:
    "Wait for a Tropass model task to complete and return the final result. Call this once with the task_id returned by a model tool; it polls the gateway until the task finishes and returns the result payload.",
  args: {
    task_id: tool.schema.string().describe("Task ID returned by the model call submit response"),
  },
  async execute(args) {
    const scriptPath = path.join(TOOL_DIRECTORY, "wait_for_model_task.py");
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Не найден скрипт ожидания задачи: ${scriptPath}`);
    }

    const { stdout } = await execFile(
      UVX_COMMAND,
      ["--with", "tropass-sdk[server]", "python", scriptPath, args.task_id, GATEWAY_URL, GATEWAY_API_TOKEN],
      {
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
        encoding: "utf8",
        env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
      },
    );
    return stdout.trim();
  },
});

function resolveToolDirectory(): string {
  const bunDirectory = (import.meta as { dir?: string }).dir;
  if (typeof bunDirectory === "string" && bunDirectory.length > 0) {
    return bunDirectory;
  }

  return path.dirname(fileURLToPath(import.meta.url));
}
