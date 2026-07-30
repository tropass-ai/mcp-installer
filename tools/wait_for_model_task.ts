import path from "node:path";

import { tool } from "@opencode-ai/plugin";

const GATEWAY_URL = "{{GATEWAY_URL}}";
const GATEWAY_API_TOKEN = "{{GATEWAY_API_TOKEN}}";

export default tool({
  description:
    "Wait for a Tropass model task to complete and return the final result. Call this once with the task_id returned by a model tool; it polls the gateway until the task finishes and returns the result payload.",
  args: {
    task_id: tool.schema.string().describe("Task ID returned by the model call submit response"),
  },
  async execute(args) {
    const scriptPath = path.join(import.meta.dir, "wait_for_model_task.py");
    const result = await Bun.$`uvx --with "tropass-sdk[server]" python ${scriptPath} ${args.task_id} ${GATEWAY_URL} ${GATEWAY_API_TOKEN}`.text();
    return result.trim();
  },
});
