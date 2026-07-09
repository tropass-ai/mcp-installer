import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {installTropassMcp} from "../src/installer.js";
import {
  MANAGED_INSTRUCTIONS_BEGIN,
  MANAGED_INSTRUCTIONS_END,
} from "../src/instructions.js";

const TEST_MCP_URL = "https://xn--80aqu.xn--80a1adciab.xn--p1ai/mcp";
const TEST_API_TOKEN = "test-token";
const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_USERPROFILE = process.env.USERPROFILE;

let tempDirs: string[] = [];

beforeEach(() => {
  vi.spyOn(childProcess, "execFileSync").mockImplementation(
    (_command: string, args?: readonly string[] | undefined, options?: childProcess.ExecFileSyncOptions | undefined) => {
      const codexHome = options?.env?.CODEX_HOME;
      if (typeof codexHome !== "string") {
        throw new Error("CODEX_HOME is required.");
      }

      const urlIndex = args?.indexOf("--url") ?? -1;
      const mcpUrl = urlIndex >= 0 ? args?.[urlIndex + 1] : undefined;
      if (!mcpUrl) {
        throw new Error("Codex MCP URL is required.");
      }

      const configPath = path.join(codexHome, "config.toml");
      const existingConfig = fs.existsSync(configPath) ? `${fs.readFileSync(configPath, "utf8").trimEnd()}\n\n` : "";
      fs.mkdirSync(codexHome, { recursive: true });
      fs.writeFileSync(
        configPath,
        `${existingConfig}[mcp_servers.tropass]\nurl = "${mcpUrl}"\nbearer_token_env_var = "TROPASS_API_TOKEN"\n`,
      );
      return Buffer.from("");
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
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
    fs.writeFileSync(configPath, 'model = "gpt-5.5"\n');

    const result = installTropassMcp({
      client: "codex",
      projectDir,
      mcpUrl: TEST_MCP_URL,
      apiToken: TEST_API_TOKEN,
    });

    expect(result.configPath).toBe(configPath);
    expect(result.scope).toBe("project");
    expect(result.instructionPath).toBe(
      path.join(projectDir, ".codex", "skills", "tropass-gateway", "SKILL.md"),
    );

    const config = fs.readFileSync(configPath, "utf8");
    expect(config).toContain('model = "gpt-5.5"');
    expect(config).toContain("[mcp_servers.tropass]");
    expect(config).toContain(`url = "${TEST_MCP_URL}"`);
    expect(config).toContain(
      `http_headers = { "Authorization" = "Bearer ${TEST_API_TOKEN}" }`,
    );
    expect(config).toContain("tool_timeout_sec = 900");
    expect(childProcess.execFileSync).toHaveBeenCalledWith(
      "codex",
      ["mcp", "add", "tropass", "--url", TEST_MCP_URL, "--bearer-token-env-var", "TROPASS_API_TOKEN"],
      expect.objectContaining({
        env: expect.objectContaining({
          CODEX_HOME: path.join(projectDir, ".codex"),
        }),
        stdio: "ignore",
      }),
    );

    const instructions = fs.readFileSync(result.instructionPath, "utf8");
    expect(instructions).toContain("name: tropass-gateway");
    expect(instructions).toContain("Tropass Gateway MCP");

    const displaySkillPath = path.join(
      projectDir,
      ".codex",
      "skills",
      "agent-response-display",
      "SKILL.md",
    );
    const displaySkill = fs.readFileSync(displaySkillPath, "utf8");
    expect(displaySkill).toContain("name: agent-response-display");
    expect(displaySkill).toContain("Interpret Tropass MCP/ML agent responses");
    expect(displaySkill).toContain("Panel ordering");
  });

  it("writes Codex global config and global skill", () => {
    const homeDir = createTempDir();
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;

    const result = installTropassMcp({
      client: "codex",
      scope: "global",
      mcpUrl: TEST_MCP_URL,
      apiToken: TEST_API_TOKEN,
    });

    expect(result.scope).toBe("global");
    expect(result.configPath).toBe(path.join(homeDir, ".codex", "config.toml"));
    expect(result.instructionPath).toBe(
      path.join(homeDir, ".codex", "skills", "tropass-gateway", "SKILL.md"),
    );
    expect(fs.readFileSync(result.configPath, "utf8")).toContain(
      "[mcp_servers.tropass]",
    );
    expect(fs.readFileSync(result.instructionPath, "utf8")).toContain(
      "Tropass Gateway MCP",
    );
    expect(
      fs.readFileSync(
        path.join(
          homeDir,
          ".codex",
          "skills",
          "agent-response-display",
          "SKILL.md",
        ),
        "utf8",
      ),
    ).toContain("Agent Response Display");
  });

  it("does not duplicate an existing Bearer prefix", () => {
    const projectDir = createTempDir();
    const configPath = path.join(projectDir, ".codex", "config.toml");

    installTropassMcp({
      client: "codex",
      projectDir,
      mcpUrl: TEST_MCP_URL,
      apiToken: `Bearer ${TEST_API_TOKEN}`,
    });

    expect(fs.readFileSync(configPath, "utf8")).toContain(
      `Bearer ${TEST_API_TOKEN}`,
    );
  });

  it("writes Claude global config and user memory for terminal agent installs", () => {
    const homeDir = createTempDir();
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    const instructionsPath = path.join(homeDir, ".claude", "CLAUDE.md");
    fs.mkdirSync(path.dirname(instructionsPath), {recursive: true});
    fs.writeFileSync(instructionsPath, "# User memory\n");

    const result = installTropassMcp({
      client: "claude",
      scope: "global",
      mcpUrl: TEST_MCP_URL,
      apiToken: TEST_API_TOKEN,
    });

    expect(result.configPath).toBe(path.join(homeDir, ".claude.json"));
    expect(result.instructionPath).toBe(instructionsPath);
    expect(readJson(result.configPath).mcpServers.tropass.type).toBe("http");
    expect(readJson(result.configPath).mcpServers.tropass.headers.Authorization).toBe(
      `Bearer ${TEST_API_TOKEN}`,
    );

    const instructions = fs.readFileSync(result.instructionPath, "utf8");
    expect(instructions).toContain("# User memory");
    expect(instructions).toContain(MANAGED_INSTRUCTIONS_BEGIN);
    expect(instructions).toContain("Claude project or custom instructions");
    expect(instructions).toContain(MANAGED_INSTRUCTIONS_END);
  });

  it("defaults Claude to project config for terminal agent installs", () => {
    const homeDir = createTempDir();
    const projectDir = createTempDir();
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;

    const result = installTropassMcp({
      client: "claude",
      projectDir,
      mcpUrl: TEST_MCP_URL,
      apiToken: TEST_API_TOKEN,
    });

    expect(result.scope).toBe("project");
    expect(result.configPath).toBe(path.join(projectDir, ".mcp.json"));
    expect(result.instructionPath).toBe(path.join(projectDir, "CLAUDE.md"));
    expect(readJson(result.configPath).mcpServers.tropass.type).toBe("http");
    expect(readJson(result.configPath).mcpServers.tropass.headers.Authorization).toBe(
      `Bearer ${TEST_API_TOKEN}`,
    );

    const instructions = fs.readFileSync(result.instructionPath, "utf8");
    expect(instructions).toContain(MANAGED_INSTRUCTIONS_BEGIN);
    expect(instructions).toContain("Claude project or custom instructions");
    expect(instructions).toContain(MANAGED_INSTRUCTIONS_END);
  });

  it("writes OpenCode project config and managed AGENTS instructions", () => {
    const projectDir = createTempDir();
    const configPath = path.join(projectDir, "opencode.json");
    const instructionsPath = path.join(projectDir, "AGENTS.md");
    writeJson(configPath, {
      theme: "system",
      mcp: {
        existing: {
          url: "https://existing.test/mcp",
        },
      },
    });
    fs.writeFileSync(instructionsPath, "# Existing agent notes\n");

    const result = installTropassMcp({
      client: "opencode",
      projectDir,
      mcpUrl: TEST_MCP_URL,
      apiToken: TEST_API_TOKEN,
    });

    expect(result.scope).toBe("project");
    expect(result.configPath).toBe(configPath);
    expect(result.instructionPath).toBe(instructionsPath);

    const config = readJson(result.configPath);
    expect(config.theme).toBe("system");
    expect(config.mcp.existing.url).toBe("https://existing.test/mcp");
    expect(config.mcp.tropass).toEqual({
      type: "remote",
      enabled: true,
      url: TEST_MCP_URL,
      headers: {
        Authorization: `Bearer ${TEST_API_TOKEN}`,
      },
    });

    const instructions = fs.readFileSync(instructionsPath, "utf8");
    expect(instructions).toContain("# Existing agent notes");
    expect(instructions).toContain(MANAGED_INSTRUCTIONS_BEGIN);
    expect(instructions).toContain("Use these instructions with OpenCode");
    expect(instructions).toContain(MANAGED_INSTRUCTIONS_END);
  });

  it("writes OpenCode global config to opencode.jsonc", () => {
    const homeDir = createTempDir();
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;

    const result = installTropassMcp({
      client: "opencode",
      scope: "global",
      mcpUrl: TEST_MCP_URL,
      apiToken: TEST_API_TOKEN,
    });

    expect(result.configPath).toBe(path.join(homeDir, ".config", "opencode", "opencode.jsonc"));
    expect(result.instructionPath).toBe(path.join(homeDir, ".config", "opencode", "AGENTS.md"));
    expect(readJson(result.configPath).mcp.tropass.url).toBe(TEST_MCP_URL);
    expect(readJson(result.configPath).mcp.tropass.headers.Authorization).toBe(
      `Bearer ${TEST_API_TOKEN}`,
    );
  });

  it("rejects unsupported clients", () => {
    expect(() =>
      installTropassMcp({
        client: "unknown",
        mcpUrl: TEST_MCP_URL,
        apiToken: TEST_API_TOKEN,
      }),
    ).toThrow("Unsupported client");
  });
});

function createTempDir(): string {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "tropass-mcp-installer-"),
  );
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
