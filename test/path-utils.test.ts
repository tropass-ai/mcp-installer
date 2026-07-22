import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  resolveOpenCodeConfigDir,
  resolveOpenCodeConfigPath,
} from "../src/path-utils.js";

const ORIGINAL_ENV = {
  HOME: process.env.HOME,
  USERPROFILE: process.env.USERPROFILE,
  XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
  OPENCODE_CONFIG: process.env.OPENCODE_CONFIG,
  OPENCODE_CONFIG_DIR: process.env.OPENCODE_CONFIG_DIR,
  APPDATA: process.env.APPDATA,
};

let tempDirs: string[] = [];

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  for (const tempDir of tempDirs) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe("resolveOpenCodeConfigDir", () => {
  it("uses ~/.config/opencode on all platforms, not APPDATA", () => {
    const homeDir = createTempDir();
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    process.env.APPDATA = path.join(homeDir, "AppData", "Roaming");
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.OPENCODE_CONFIG_DIR;

    expect(resolveOpenCodeConfigDir()).toBe(
      path.join(homeDir, ".config", "opencode"),
    );
  });

  it("honors XDG_CONFIG_HOME", () => {
    const homeDir = createTempDir();
    const xdgConfig = path.join(homeDir, "xdg-config");
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    process.env.XDG_CONFIG_HOME = xdgConfig;
    delete process.env.OPENCODE_CONFIG_DIR;

    expect(resolveOpenCodeConfigDir()).toBe(path.join(xdgConfig, "opencode"));
  });

  it("honors OPENCODE_CONFIG_DIR", () => {
    const homeDir = createTempDir();
    const customDir = path.join(homeDir, "custom-opencode");
    process.env.OPENCODE_CONFIG_DIR = customDir;

    expect(resolveOpenCodeConfigDir()).toBe(customDir);
  });
});

describe("resolveOpenCodeConfigPath", () => {
  it("defaults to opencode.jsonc when no config exists", () => {
    const homeDir = createTempDir();
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.OPENCODE_CONFIG;
    delete process.env.OPENCODE_CONFIG_DIR;

    expect(resolveOpenCodeConfigPath()).toBe(
      path.join(homeDir, ".config", "opencode", "opencode.jsonc"),
    );
  });

  it("prefers an existing opencode.json", () => {
    const homeDir = createTempDir();
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.OPENCODE_CONFIG;
    delete process.env.OPENCODE_CONFIG_DIR;

    const configDir = path.join(homeDir, ".config", "opencode");
    fs.mkdirSync(configDir, { recursive: true });
    const jsonPath = path.join(configDir, "opencode.json");
    fs.writeFileSync(jsonPath, "{}\n");

    expect(resolveOpenCodeConfigPath()).toBe(jsonPath);
  });

  it("prefers opencode.json when both json and jsonc exist", () => {
    const homeDir = createTempDir();
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.OPENCODE_CONFIG;
    delete process.env.OPENCODE_CONFIG_DIR;

    const configDir = path.join(homeDir, ".config", "opencode");
    fs.mkdirSync(configDir, { recursive: true });
    const jsonPath = path.join(configDir, "opencode.json");
    const jsoncPath = path.join(configDir, "opencode.jsonc");
    fs.writeFileSync(jsonPath, '{"mcp":{}}\n');
    fs.writeFileSync(jsoncPath, '{"$schema":"https://opencode.ai/config.json"}\n');

    expect(resolveOpenCodeConfigPath()).toBe(jsonPath);
  });

  it("honors OPENCODE_CONFIG", () => {
    const homeDir = createTempDir();
    const customFile = path.join(homeDir, "custom.json");
    process.env.OPENCODE_CONFIG = customFile;

    expect(resolveOpenCodeConfigPath()).toBe(customFile);
  });
});

function createTempDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tropass-path-utils-"));
  tempDirs.push(tempDir);
  return tempDir;
}
