import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { installTropassMcp } from "../src/installer.js";
import { MANAGED_INSTRUCTIONS_BEGIN, MANAGED_INSTRUCTIONS_END } from "../src/instructions.js";

const TEST_MCP_URL = "https://api.tropass.me/mcp";
const TEST_API_TOKEN = "test-token";

let tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe("installTropassMcp", () => {
  it("writes Cursor config and rule without removing existing MCP servers", () => {
    const projectDir = createTempDir();
    const configPath = path.join(projectDir, ".cursor", "mcp.json");
    writeJson(configPath, {
      mcpServers: {
        existing: {
          command: "existing-server"
        }
      }
    });

    const result = installTropassMcp({
      client: "cursor",
      projectDir,
      mcpUrl: TEST_MCP_URL,
      apiToken: TEST_API_TOKEN
    });

    expect(result.configPath).toBe(configPath);
    expect(result.instructionPath).toBe(path.join(projectDir, ".cursor", "rules", "tropass-mcp.mdc"));

    const config = readJson(configPath);
    expect(config.mcpServers.existing.command).toBe("existing-server");
    expect(config.mcpServers.tropass).toEqual({
      command: "npx",
      args: ["-y", "@tropass/mcp-proxy"],
      env: {
        TROPASS_MCP_URL: TEST_MCP_URL,
        TROPASS_API_TOKEN: TEST_API_TOKEN
      }
    });

    const instructions = fs.readFileSync(result.instructionPath, "utf8");
    expect(instructions).toContain("alwaysApply: true");
    expect(instructions).toContain("Tropass MCP Instructions");
  });

  it("updates VS Code managed instruction block and preserves user text", () => {
    const projectDir = createTempDir();
    const instructionsPath = path.join(projectDir, ".github", "copilot-instructions.md");
    fs.mkdirSync(path.dirname(instructionsPath), { recursive: true });
    fs.writeFileSync(
      instructionsPath,
      `# User instructions

Keep this.

${MANAGED_INSTRUCTIONS_BEGIN}
old text
${MANAGED_INSTRUCTIONS_END}

Keep this too.
`
    );

    const result = installTropassMcp({
      client: "vscode",
      projectDir,
      mcpUrl: TEST_MCP_URL,
      apiToken: TEST_API_TOKEN
    });

    const config = readJson(path.join(projectDir, ".vscode", "mcp.json"));
    expect(config.servers.tropass.type).toBe("stdio");
    expect(config.servers.tropass.env.TROPASS_API_TOKEN).toBe(TEST_API_TOKEN);

    const instructions = fs.readFileSync(result.instructionPath, "utf8");
    expect(instructions).toContain("# User instructions");
    expect(instructions).toContain("Keep this.");
    expect(instructions).toContain("Keep this too.");
    expect(instructions).toContain("Tropass MCP Instructions");
    expect(instructions).not.toContain("old text");
  });

  it("writes Claude config to explicit path and instructions next to it", () => {
    const tempDir = createTempDir();
    const configPath = path.join(tempDir, "Claude", "claude_desktop_config.json");

    const result = installTropassMcp({
      client: "claude",
      configPath,
      mcpUrl: TEST_MCP_URL,
      apiToken: TEST_API_TOKEN
    });

    expect(result.configPath).toBe(configPath);
    expect(result.instructionPath).toBe(path.join(tempDir, "Claude", "tropass-mcp-instructions.md"));
    expect(readJson(configPath).mcpServers.tropass.env.TROPASS_API_TOKEN).toBe(TEST_API_TOKEN);
    expect(fs.readFileSync(result.instructionPath, "utf8")).toContain("Claude project or custom instructions");
  });

  it("rejects unsupported clients", () => {
    expect(() => installTropassMcp({
      client: "unknown",
      mcpUrl: TEST_MCP_URL,
      apiToken: TEST_API_TOKEN
    })).toThrow("Unsupported client");
  });
});

function createTempDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tropass-mcp-proxy-"));
  tempDirs.push(tempDir);
  return tempDir;
}

function writeJson(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
