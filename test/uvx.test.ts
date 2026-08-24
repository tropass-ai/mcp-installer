import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { findUvx, uvxExecutable } from "../src/uvx.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("findUvx", () => {
  it("prefers an absolute path over the bare executable from PATH", () => {
    vi.spyOn(childProcess, "spawnSync").mockReturnValue({ status: 0 } as never);
    vi.spyOn(fs, "existsSync").mockReturnValue(true);

    const found = findUvx();
    expect(found).toMatch(/uvx(\.exe)?$/);
    expect(path.isAbsolute(found as string)).toBe(true);
    expect(found).not.toBe(uvxExecutable());
  });

  it("falls back to PATH when uvx sits in an unknown location", () => {
    vi.spyOn(childProcess, "spawnSync").mockReturnValue({ status: 0 } as never);
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    expect(findUvx()).toBe(uvxExecutable());
  });

  it("returns undefined when uvx is nowhere to be found", () => {
    vi.spyOn(childProcess, "spawnSync").mockReturnValue({ status: 1 } as never);
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    expect(findUvx()).toBeUndefined();
  });
});
