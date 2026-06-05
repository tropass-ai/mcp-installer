import fs from "node:fs";
import path from "node:path";
import { createInterface as createPromptInterface } from "node:readline/promises";
import process from "node:process";

import { DEFAULT_MCP_URL, SUPPORTED_INSTALL_CLIENTS } from "./constants.js";
import { buildInstructionContent, MANAGED_INSTRUCTIONS_BEGIN, MANAGED_INSTRUCTIONS_END } from "./instructions.js";
import { expandHome, resolveClaudeDesktopConfigPath } from "./path-utils.js";

export async function runInstall(argv) {
  const options = parseInstallArgs(argv);
  const client = options.client || await promptForClient();

  if (!SUPPORTED_INSTALL_CLIENTS.has(client)) {
    throw new Error(`Unsupported client '${client}'. Use one of: ${[...SUPPORTED_INSTALL_CLIENTS].join(", ")}.`);
  }

  const mcpUrl = options.yes ? options.mcpUrl : await promptForText("Tropass MCP URL", options.mcpUrl);
  const apiToken = options.apiToken || await promptForSecret("Tropass API token");

  if (!apiToken) {
    throw new Error("Tropass API token is required.");
  }

  const configPath = resolveConfigPath(client, options);
  installServerConfig(client, configPath, mcpUrl, apiToken);

  const instructionPath = resolveInstructionPath(client, options, configPath);
  installInstructions(client, instructionPath);

  process.stderr.write(`Installed Tropass MCP for ${client}.\n`);
  process.stderr.write(`Config file: ${configPath}\n`);
  process.stderr.write(`Instructions file: ${instructionPath}\n`);
  process.stderr.write("Restart or reload your MCP client to pick up the new server.\n");
}

function parseInstallArgs(argv) {
  const options = {
    client: undefined,
    configPath: undefined,
    mcpUrl: process.env.TROPASS_MCP_URL || DEFAULT_MCP_URL,
    apiToken: process.env.TROPASS_API_TOKEN,
    projectDir: process.cwd(),
    yes: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--client") {
      options.client = argv[++index];
    } else if (arg === "--config") {
      options.configPath = argv[++index];
    } else if (arg === "--url") {
      options.mcpUrl = argv[++index];
    } else if (arg === "--token") {
      options.apiToken = argv[++index];
    } else if (arg === "--project") {
      options.projectDir = argv[++index];
    } else if (arg === "--yes" || arg === "-y") {
      options.yes = true;
    } else if (!arg.startsWith("-") && options.client === undefined) {
      options.client = arg;
    } else {
      throw new Error(`Unknown install argument: ${arg}`);
    }
  }

  return options;
}

function resolveConfigPath(client, options) {
  if (options.configPath) {
    return path.resolve(expandHome(options.configPath));
  }

  const projectDir = path.resolve(expandHome(options.projectDir));
  if (client === "cursor") {
    return path.join(projectDir, ".cursor", "mcp.json");
  }
  if (client === "vscode") {
    return path.join(projectDir, ".vscode", "mcp.json");
  }
  if (client === "generic") {
    return path.join(projectDir, "mcp.json");
  }
  if (client === "claude-desktop") {
    return resolveClaudeDesktopConfigPath();
  }

  throw new Error(`Unsupported client: ${client}`);
}

function resolveInstructionPath(client, options, configPath) {
  const projectDir = path.resolve(expandHome(options.projectDir));
  if (client === "cursor") {
    return path.join(projectDir, ".cursor", "rules", "tropass-mcp.mdc");
  }
  if (client === "vscode") {
    return path.join(projectDir, ".github", "copilot-instructions.md");
  }
  if (client === "generic") {
    return path.join(projectDir, "AGENTS.md");
  }
  if (client === "claude-desktop") {
    return path.join(path.dirname(configPath), "tropass-mcp-instructions.md");
  }

  throw new Error(`Unsupported client: ${client}`);
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const payload = fs.readFileSync(filePath, "utf8").trim();
  if (!payload) {
    return {};
  }
  return JSON.parse(payload);
}

function buildServerConfig(mcpUrl, apiToken) {
  return {
    command: "npx",
    args: ["-y", "@tropass/mcp-proxy"],
    env: {
      TROPASS_MCP_URL: mcpUrl,
      TROPASS_API_TOKEN: apiToken
    }
  };
}

function installServerConfig(client, configPath, mcpUrl, apiToken) {
  const payload = readJsonFile(configPath);
  const serverConfig = buildServerConfig(mcpUrl, apiToken);

  if (client === "vscode") {
    payload.servers = {
      ...(payload.servers || {}),
      tropass: {
        type: "stdio",
        ...serverConfig
      }
    };
  } else {
    payload.mcpServers = {
      ...(payload.mcpServers || {}),
      tropass: serverConfig
    };
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function installInstructions(client, instructionPath) {
  const instructionContent = buildInstructionContent(client);
  if (client === "vscode" || client === "generic") {
    upsertManagedInstructionBlock(instructionPath, instructionContent);
    return;
  }
  writeTextFile(instructionPath, instructionContent);
}

function upsertManagedInstructionBlock(filePath, content) {
  const managedBlock = `${MANAGED_INSTRUCTIONS_BEGIN}\n${content.trim()}\n${MANAGED_INSTRUCTIONS_END}`;

  if (!fs.existsSync(filePath)) {
    writeTextFile(filePath, managedBlock);
    return;
  }

  const existingContent = fs.readFileSync(filePath, "utf8");
  const startIndex = existingContent.indexOf(MANAGED_INSTRUCTIONS_BEGIN);
  const endIndex = existingContent.indexOf(MANAGED_INSTRUCTIONS_END);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const before = existingContent.slice(0, startIndex).trimEnd();
    const after = existingContent.slice(endIndex + MANAGED_INSTRUCTIONS_END.length).trimStart();
    writeTextFile(filePath, [before, managedBlock, after].filter(Boolean).join("\n\n"));
    return;
  }

  writeTextFile(filePath, `${existingContent.trimEnd()}\n\n${managedBlock}\n`);
}

function writeTextFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.endsWith("\n") ? content : `${content}\n`);
}

async function promptForClient() {
  const rl = createPromptInterface({
    input: process.stdin,
    output: process.stderr
  });

  try {
    process.stderr.write("Choose MCP client:\n");
    process.stderr.write("  1. cursor\n");
    process.stderr.write("  2. vscode\n");
    process.stderr.write("  3. claude-desktop\n");
    process.stderr.write("  4. generic\n");
    const answer = (await rl.question("Client [cursor]: ")).trim();
    if (!answer || answer === "1") {
      return "cursor";
    }
    if (answer === "2") {
      return "vscode";
    }
    if (answer === "3") {
      return "claude-desktop";
    }
    if (answer === "4") {
      return "generic";
    }
    return answer;
  } finally {
    rl.close();
  }
}

async function promptForText(question, defaultValue) {
  const rl = createPromptInterface({
    input: process.stdin,
    output: process.stderr
  });

  try {
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    const answer = (await rl.question(`${question}${suffix}: `)).trim();
    return answer || defaultValue;
  } finally {
    rl.close();
  }
}

async function promptForSecret(question) {
  if (!process.stdin.isTTY) {
    return promptForText(question);
  }

  process.stderr.write(`${question}: `);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return await new Promise((resolve) => {
    let value = "";

    const onData = (char) => {
      if (char === "\u0003") {
        process.stderr.write("\n");
        process.exit(130);
      }
      if (char === "\r" || char === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.off("data", onData);
        process.stderr.write("\n");
        resolve(value);
        return;
      }
      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };

    process.stdin.on("data", onData);
  });
}

