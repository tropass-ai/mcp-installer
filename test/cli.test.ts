import process from "node:process";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RawInstallOptions } from "../src/types.js";

const runInstall = vi.fn<(options?: RawInstallOptions) => Promise<void>>();

vi.mock("../src/installer.js", () => ({
  runInstall
}));

describe("main", () => {
  const originalArgv = process.argv;
  let stdout = "";

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.argv = ["node", "/usr/local/bin/tropass-mcp-install"];
    stdout = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      stdout += chunk.toString();
      return true;
    });
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  it("starts interactive installer when no arguments are passed", async () => {
    const { main } = await import("../src/cli.js");

    await main();

    expect(runInstall).toHaveBeenCalledWith({});
  });

  it("routes options to installer", async () => {
    process.argv = [
      "node",
      "/usr/local/bin/tropass-mcp-install",
      "opencode",
      "--config",
      "/tmp/mcp.json",
      "--token",
      "token-123",
      "--project",
      "/workspace/project",
      "--scope",
      "global",
      "--yes"
    ];
    const { main } = await import("../src/cli.js");

    await main();

    expect(runInstall).toHaveBeenCalledWith({
      client: "opencode",
      config: "/tmp/mcp.json",
      token: "token-123",
      project: "/workspace/project",
      scope: "global",
      yes: true
    });
  });

  it("routes global and local aliases to installer", async () => {
    process.argv = [
      "node",
      "/usr/local/bin/tropass-mcp-install",
      "opencode",
      "--token",
      "token-123",
      "--global",
      "--yes"
    ];
    const { main } = await import("../src/cli.js");

    await main();

    expect(runInstall).toHaveBeenCalledWith({
      client: "opencode",
      token: "token-123",
      global: true,
      yes: true
    });
  });

  it("accepts install subcommand as a compatibility alias", async () => {
    process.argv = [
      "node",
      "/usr/local/bin/tropass-mcp-install",
      "install",
      "opencode",
      "--token",
      "token-123",
      "--yes"
    ];
    const { main } = await import("../src/cli.js");

    await main();

    expect(runInstall).toHaveBeenCalledWith({
      client: "opencode",
      token: "token-123",
      yes: true
    });
  });

  it("prints installer help", async () => {
    process.argv = ["node", "/usr/local/bin/tropass-mcp-install", "--help"];
    const { main } = await import("../src/cli.js");

    await main();

    expect(stdout).toContain("Использование: tropass-mcp-install [options] [client]");
    expect(stdout).toContain("Аргументы:");
    expect(stdout).toContain("Параметры:");
    expect(stdout).toContain("Настраивает удалённый MCP-сервер Tropass и инструкции агента.");
    expect(stdout).toContain("Tropass: https://тропасс.рф/");
    expect(stdout).toContain("MCP-клиент: opencode");
    expect(stdout).toContain("--url");
    expect(stdout).toContain("--llm-url");
    expect(stdout).toContain("область установки: global или project");
    expect(stdout).toContain("показать справку");
    expect(runInstall).not.toHaveBeenCalled();
  });
});
