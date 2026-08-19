import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { installTropassMcp } from "../src/installer.js";

const TEST_MCP_GATEWAY_URL = "https://апи.тропасс.рф";
const TEST_MCP_URL = `${TEST_MCP_GATEWAY_URL}/mcp`;
const TEST_LLM_GATEWAY_URL = "https://апи.ллм.тропасс.рф";
const TEST_LLM_MODEL = "GLM-5.2";
const TEST_API_TOKEN = "test-token";
const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_USERPROFILE = process.env.USERPROFILE;
const ORIGINAL_XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME;
const ORIGINAL_OPENCODE_CONFIG = process.env.OPENCODE_CONFIG;
const ORIGINAL_OPENCODE_CONFIG_DIR = process.env.OPENCODE_CONFIG_DIR;

let tempDirs: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  process.env.HOME = ORIGINAL_HOME;
  process.env.USERPROFILE = ORIGINAL_USERPROFILE;
  restoreEnv("XDG_CONFIG_HOME", ORIGINAL_XDG_CONFIG_HOME);
  restoreEnv("OPENCODE_CONFIG", ORIGINAL_OPENCODE_CONFIG);
  restoreEnv("OPENCODE_CONFIG_DIR", ORIGINAL_OPENCODE_CONFIG_DIR);
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
    const toolPath = path.join(projectDir, ".opencode", "tools", "wait_for_model_task.ts");
    const toolScriptPath = path.join(projectDir, ".opencode", "tools", "wait_for_model_task.py");
    const usagePluginPath = path.join(projectDir, ".opencode", "tropass-usage.mjs");
    writeJson(configPath, {
      theme: "system",
      command: {
        existing: {
          description: "Existing command",
          template: "Keep me",
        },
      },
      mcp: {
        existing: {
          url: "https://existing.test/mcp",
        },
      },
    });
    writeJson(path.join(projectDir, ".opencode", "tui.json"), {plugin: ["existing-plugin"]});
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

    expect(result.toolPaths).toEqual([toolPath, toolScriptPath]);
    expect(result.pluginPaths).toEqual([usagePluginPath]);

    const config = readJson(result.configPath);
    expect(config.theme).toBe("system");
    expect(config.model).toBe(`tropass/${TEST_LLM_MODEL}`);
    expect(config.command.existing).toEqual({
      description: "Existing command",
      template: "Keep me",
    });
    expect(config.command.usage).toBeUndefined();
    expect(config.mcp.existing.url).toBe("https://existing.test/mcp");
    expect(config.mcp.tropass).toEqual({
      type: "remote",
      enabled: true,
      timeout: 1_800_000,
      url: TEST_MCP_URL,
      headers: {
        Authorization: `Bearer ${TEST_API_TOKEN}`,
        "Tropass-Model-Call-Version": "2",
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
          modalities: {
            input: ["text", "image"],
            output: ["text"],
          },
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

    expect(fs.readFileSync(toolPath, "utf8")).toContain(`GATEWAY_URL = "${TEST_MCP_GATEWAY_URL}"`);
    expect(fs.readFileSync(toolPath, "utf8")).toContain(`GATEWAY_API_TOKEN = "${TEST_API_TOKEN}"`);
    const toolScript = fs.readFileSync(toolScriptPath, "utf8");
    expect(toolScript).toContain("wait_for_model_task");
    expect(toolScript).not.toContain(TEST_MCP_GATEWAY_URL);
    expect(toolScript).not.toContain(TEST_API_TOKEN);
    const usagePlugin = fs.readFileSync(usagePluginPath, "utf8");
    expect(usagePlugin).toContain('slashName: "usage"');
    expect(usagePlugin).toContain(
      Buffer.from(`${TEST_LLM_GATEWAY_URL}/api/rpc/fetch-token-usage/`).toString("base64"),
    );
    expect(usagePlugin).toContain(Buffer.from(TEST_API_TOKEN).toString("base64"));
    expect(readJson(path.join(projectDir, ".opencode", "tui.json")).plugin).toEqual([
      "existing-plugin",
      "./tropass-usage.mjs",
    ]);
  });

  it("defaults to OpenCode global config", () => {
    const homeDir = createTempDir();
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.OPENCODE_CONFIG;
    delete process.env.OPENCODE_CONFIG_DIR;
    const configPath = path.join(homeDir, ".config", "opencode", "opencode.jsonc");
    const skillsPath = path.join(homeDir, ".config", "opencode", "skills");
    const displaySkillPath = path.join(skillsPath, "agent-response-display", "SKILL.md");
    const globalToolPath = path.join(homeDir, ".config", "opencode", "tools", "wait_for_model_task.ts");
    const globalUsagePluginPath = path.join(homeDir, ".config", "opencode", "tropass-usage.mjs");

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
    expect(readJson(result.configPath).mcp.tropass.timeout).toBe(1_800_000);
    expect(readJson(result.configPath).mcp.tropass.headers.Authorization).toBe(
      `Bearer ${TEST_API_TOKEN}`,
    );
    expect(readJson(result.configPath).mcp.tropass.headers["Tropass-Model-Call-Version"]).toBe("2");
    expect(readJson(result.configPath).provider.tropass.options).toMatchObject({
      baseURL: `${TEST_LLM_GATEWAY_URL}/v1`,
      apiKey: TEST_API_TOKEN,
    });
    expect(fs.readFileSync(globalToolPath, "utf8")).toContain(`GATEWAY_URL = "${TEST_MCP_GATEWAY_URL}"`);
    expect(fs.readFileSync(globalToolPath, "utf8")).toContain(`GATEWAY_API_TOKEN = "${TEST_API_TOKEN}"`);
    expect(result.pluginPaths).toEqual([globalUsagePluginPath]);
    expect(readJson(path.join(homeDir, ".config", "opencode", "tui.json")).plugin).toEqual([
      "./tropass-usage.mjs",
    ]);
  });

  it.each(["codex", "claude"])("rejects removed client %s", (client) => {
    expect(() =>
      installTropassMcp({
        client,
        mcpUrl: TEST_MCP_URL,
        apiToken: TEST_API_TOKEN,
      }),
    ).toThrow("не поддерживается");
  });
});

function createTempDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tropass-mcp-installer-"));
  tempDirs.push(tempDir);
  return tempDir;
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

function writeJson(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
