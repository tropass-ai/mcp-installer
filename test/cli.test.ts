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
      "cursor",
      "--config",
      "/tmp/mcp.json",
      "--url",
      "https://example.test/mcp",
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
      client: "cursor",
      config: "/tmp/mcp.json",
      url: "https://example.test/mcp",
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
      "codex",
      "--token",
      "token-123",
      "--global",
      "--yes"
    ];
    const { main } = await import("../src/cli.js");

    await main();

    expect(runInstall).toHaveBeenCalledWith({
      client: "codex",
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

    expect(stdout).toContain("Usage: tropass-mcp-install [options] [client]");
    expect(stdout).toContain("Install direct remote Tropass MCP config and agent instructions.");
    expect(stdout).toContain("Tropass: https://xn--80a1adciab.xn--p1ai/");
    expect(stdout).toContain("codex, cursor, claude, or opencode");
    expect(stdout).toContain("install scope: project or global");
    expect(runInstall).not.toHaveBeenCalled();
  });
});
