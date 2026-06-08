import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { installTropassMcp } from "../src/installer.js";
import { MANAGED_INSTRUCTIONS_BEGIN, MANAGED_INSTRUCTIONS_END } from "../src/instructions.js";

const TEST_MCP_URL = "https://api.tropass.me/mcp";
const TEST_API_TOKEN = "test-token";
const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_USERPROFILE = process.env.USERPROFILE;

let tempDirs: string[] = [];

afterEach(() => {
  process.env.HOME = ORIGINAL_HOME;
  process.env.USERPROFILE = ORIGINAL_USERPROFILE;
  for (const tempDir of tempDirs) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe("installTropassMcp", () => {
  it("writes Codex project config and project skill without removing existing config", () => {
    const projectDir = createTempDir();
    const configPath = path.join(projectDir, ".codex", "config.toml");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, "model = \"gpt-5.5\"\n");

    const result = installTropassMcp({
      client: "codex",
      projectDir,
      mcpUrl: TEST_MCP_URL,
      apiToken: TEST_API_TOKEN
    });

    expect(result.configPath).toBe(configPath);
    expect(result.scope).toBe("project");
    expect(result.instructionPath).toBe(path.join(projectDir, ".codex", "skills", "tropass-gateway", "SKILL.md"));

    const config = fs.readFileSync(configPath, "utf8");
    expect(config).toContain("model = \"gpt-5.5\"");
    expect(config).toContain("# BEGIN TROPASS MCP CONFIG");
    expect(config).toContain("[mcp_servers.tropass]");
    expect(config).toContain(`url = "${TEST_MCP_URL}"`);
    expect(config).toContain(`headers = { "X-API-TOKEN" = "${TEST_API_TOKEN}" }`);

    const instructions = fs.readFileSync(result.instructionPath, "utf8");
    expect(instructions).toContain("name: tropass-gateway");
    expect(instructions).toContain("Tropass Gateway MCP");
  });

  it("writes Codex global config and global skill", () => {
    const homeDir = createTempDir();
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;

    const result = installTropassMcp({
      client: "codex",
      scope: "global",
      mcpUrl: TEST_MCP_URL,
      apiToken: TEST_API_TOKEN
    });

    expect(result.scope).toBe("global");
    expect(result.configPath).toBe(path.join(homeDir, ".codex", "config.toml"));
    expect(result.instructionPath).toBe(path.join(homeDir, ".codex", "skills", "tropass-gateway", "SKILL.md"));
    expect(fs.readFileSync(result.configPath, "utf8")).toContain("[mcp_servers.tropass]");
    expect(fs.readFileSync(result.instructionPath, "utf8")).toContain("Tropass Gateway MCP");
  });

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
      url: TEST_MCP_URL,
      headers: {
        "X-API-TOKEN": TEST_API_TOKEN
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
    expect(config.servers.tropass.type).toBe("http");
    expect(config.servers.tropass.headers["X-API-TOKEN"]).toBe(TEST_API_TOKEN);

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
    expect(readJson(configPath).mcpServers.tropass.headers["X-API-TOKEN"]).toBe(TEST_API_TOKEN);
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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tropass-mcp-installer-"));
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
