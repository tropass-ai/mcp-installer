import process from "node:process";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RawInstallOptions } from "../src/types.js";

const runInstall = vi.fn<(options?: RawInstallOptions) => Promise<void>>();
const runProxy = vi.fn<() => Promise<void>>();

vi.mock("../src/installer.js", () => ({
  runInstall
}));

vi.mock("../src/proxy.js", () => ({
  runProxy
}));

describe("main", () => {
  const originalArgv = process.argv;
  let stdout = "";

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.argv = ["node", "/usr/local/bin/tropass-mcp-proxy"];
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

  it("starts proxy runtime when no arguments are passed", async () => {
    const { main } = await import("../src/cli.js");

    await main();

    expect(runProxy).toHaveBeenCalledOnce();
    expect(runInstall).not.toHaveBeenCalled();
  });

  it("routes install subcommand options to installer", async () => {
    process.argv = [
      "node",
      "/usr/local/bin/tropass-mcp-proxy",
      "install",
      "cursor",
      "--config",
      "/tmp/mcp.json",
      "--url",
      "https://example.test/mcp",
      "--token",
      "token-123",
      "--project",
      "/workspace/project",
      "--yes"
    ];
    const { main } = await import("../src/cli.js");

    await main();

    expect(runInstall).toHaveBeenCalledWith({
      client: "cursor",
      config: "/tmp/mcp.json",
      url: "https://example.test/mcp",
      token: "token-123",
      project: "/workspace/project",
      yes: true
    });
    expect(runProxy).not.toHaveBeenCalled();
  });

  it("routes tropass-mcp-install executable alias to installer", async () => {
    process.argv = [
      "node",
      "/usr/local/bin/tropass-mcp-install",
      "vscode",
      "--token",
      "token-123",
      "--yes"
    ];
    const { main } = await import("../src/cli.js");

    await main();

    expect(runInstall).toHaveBeenCalledWith({
      client: "vscode",
      token: "token-123",
      yes: true
    });
    expect(runProxy).not.toHaveBeenCalled();
  });

  it("prints root help without starting proxy or installer", async () => {
    process.argv = ["node", "/usr/local/bin/tropass-mcp-proxy", "--help"];
    const { main } = await import("../src/cli.js");

    await main();

    expect(stdout).toContain("Usage: tropass-mcp-proxy [install] [options]");
    expect(stdout).toContain("Run without arguments to start the stdio MCP proxy runtime.");
    expect(runInstall).not.toHaveBeenCalled();
    expect(runProxy).not.toHaveBeenCalled();
  });
});
