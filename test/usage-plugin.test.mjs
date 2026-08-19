import {afterEach, describe, expect, it, vi} from "vitest";

import plugin, {formatUsage} from "../tools/tropass-usage.mjs";

afterEach(() => vi.unstubAllGlobals());

describe("native usage plugin", () => {
  it("formats and clamps weekly usage", () => {
    const output = formatUsage({
      used: 1500,
      limit: 1000,
      remaining: 0,
      reset_at: "2026-08-25T09:00:00Z",
    }, "en-US", "UTC");

    expect(output).toContain("████████████████████████ 100%");
    expect(output).toContain("Used       1,500");
    expect(output).toContain("Remaining  0");
    expect(output).toContain("Limit      1,000");
    expect(output).toContain("Resets     Aug 25, 2026, 9:00 AM");
  });

  it("falls back to formatted JSON for an unknown response", () => {
    expect(formatUsage({message: "unknown"})).toBe('{\n  "message": "unknown"\n}');
  });

  it("fetches usage and opens a dialog without session APIs", async () => {
    let command;
    const show = vi.fn();
    const toast = vi.fn();
    await plugin.tui({
      keymap: {registerLayer: ({commands}) => { [command] = commands; }},
      ui: {DialogAlert: {show}, dialog: {}, toast},
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({used: 1, limit: 4, remaining: 3, reset_at: 0}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await command.run();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(show).toHaveBeenCalledWith(expect.anything(), "Tropass usage", expect.stringContaining("25%"));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({variant: "info"}));
  });
});
