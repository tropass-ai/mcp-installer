import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { installTropassMcp } from "../src/installer.js";

const TEST_MCP_GATEWAY_URL = "https://апи.тропасс.рф";
const TEST_MCP_URL = `${TEST_MCP_GATEWAY_URL}/mcp`;
const TEST_LLM_GATEWAY_URL = "https://апи.ллм.тропасс.рф";
const TEST_LLM_MODEL = "Qwen3.5-397B-A17B-FP8";
const TEST_API_TOKEN = "test-token";
const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_USERPROFILE = process.env.USERPROFILE;

let tempDirs: string[] = [];

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
  it("writes OpenCode project config and copies native skills", () => {
    const projectDir = createTempDir();
    const configPath = path.join(projectDir, "opencode.json");
    const agentsPath = path.join(projectDir, "AGENTS.md");
    const gatewaySkillPath = path.join(projectDir, ".opencode", "skills", "tropass-gateway", "SKILL.md");
    const displaySkillPath = path.join(projectDir, ".opencode", "skills", "agent-response-display", "SKILL.md");
    writeJson(configPath, {
      theme: "system",
      mcp: {
        existing: {
          url: "https://existing.test/mcp",
        },
      },
    });
    fs.writeFileSync(agentsPath, "# Existing agent notes\n");

    const result = installTropassMcp({
      projectDir,
      scope: "project",
      mcpUrl: `${TEST_MCP_GATEWAY_URL}/`,
      apiToken: TEST_API_TOKEN,
    });

    expect(result.client).toBe("opencode");
    expect(result.scope).toBe("project");
    expect(result.configPath).toBe(configPath);
    expect(result.skillPaths).toEqual([gatewaySkillPath, displaySkillPath]);

    const config = readJson(result.configPath);
    expect(config.theme).toBe("system");
    expect(config.model).toBe(`tropass/${TEST_LLM_MODEL}`);
    expect(config.mcp.existing.url).toBe("https://existing.test/mcp");
    expect(config.mcp.tropass).toEqual({
      type: "remote",
      enabled: true,
      url: TEST_MCP_URL,
      headers: {
        Authorization: `Bearer ${TEST_API_TOKEN}`,
      },
    });
    expect(config.provider.tropass).toEqual({
      npm: "@ai-sdk/openai-compatible",
      name: "Tropass",
      options: {
        baseURL: `${TEST_LLM_GATEWAY_URL}/v1`,
        apiKey: TEST_API_TOKEN,
      },
      models: {
        [TEST_LLM_MODEL]: {
          name: TEST_LLM_MODEL,
        },
      },
    });

    expect(fs.readFileSync(agentsPath, "utf8")).toBe("# Existing agent notes\n");
    expect(fs.readFileSync(gatewaySkillPath, "utf8")).toBe(
      fs.readFileSync(path.resolve("skills", "tropass-gateway", "SKILL.md"), "utf8"),
    );
    expect(fs.readFileSync(displaySkillPath, "utf8")).toBe(
      fs.readFileSync(path.resolve("skills", "agent-response-display", "SKILL.md"), "utf8"),
    );
  });

  it("defaults to OpenCode global config", () => {
    const homeDir = createTempDir();
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    const configPath = path.join(homeDir, ".config", "opencode", "opencode.jsonc");
    const skillsPath = path.join(homeDir, ".config", "opencode", "skills");
    const displaySkillPath = path.join(skillsPath, "agent-response-display", "SKILL.md");

    const result = installTropassMcp({
      client: "opencode",
      configPath,
      mcpUrl: TEST_MCP_URL,
      apiToken: TEST_API_TOKEN,
    });

    expect(result.configPath).toBe(configPath);
    expect(result.skillPaths).toEqual([
      path.join(skillsPath, "tropass-gateway", "SKILL.md"),
      displaySkillPath,
    ]);
    expect(fs.readFileSync(displaySkillPath, "utf8")).toContain("name: agent-response-display");
    expect(readJson(result.configPath).mcp.tropass.url).toBe(TEST_MCP_URL);
    expect(readJson(result.configPath).mcp.tropass.headers.Authorization).toBe(
      `Bearer ${TEST_API_TOKEN}`,
    );
    expect(readJson(result.configPath).provider.tropass.options).toMatchObject({
      baseURL: `${TEST_LLM_GATEWAY_URL}/v1`,
      apiKey: TEST_API_TOKEN,
    });
  });

  it.each(["codex", "claude"])("rejects removed client %s", (client) => {
    expect(() =>
      installTropassMcp({
        client,
        mcpUrl: TEST_MCP_URL,
        apiToken: TEST_API_TOKEN,
      }),
    ).toThrow("Unsupported client");
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
