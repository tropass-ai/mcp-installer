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

  it("formats the unlimited response returned by Tropass", () => {
    const output = formatUsage({
      used_tokens: 1152920,
      initial_limit_tokens: null,
      remaining_tokens: null,
      reset_at: "2026-08-19T08:20:19Z",
    }, "en-US", "UTC");

    expect(output).toContain("──────────────────────── ∞");
    expect(output).toContain("Used       1,152,920");
    expect(output).toContain("Remaining  Unlimited");
    expect(output).toContain("Limit      Unlimited");
  });

  it("formats usage before the first request", () => {
    const output = formatUsage({
      used_tokens: 0,
      initial_limit_tokens: null,
      remaining_tokens: null,
      reset_at: null,
    }, "en-US", "UTC");

    expect(output).toContain("Used       0");
    expect(output).toContain("Resets     Not scheduled");
  });

  it("fetches usage and opens a dialog without session APIs", async () => {
    let command;
    const replace = vi.fn((render) => render());
    const toast = vi.fn();
    await plugin.tui({
      command: {register: (commands) => { [command] = commands(); }},
      ui: {
        DialogAlert: vi.fn((props) => props),
        dialog: {clear: vi.fn(), replace},
        toast,
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({used: 1, limit: 4, remaining: 3, reset_at: 0}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await command.onSelect();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(command.slash).toEqual({name: "usage"});
    expect(replace).toHaveReturnedWith(expect.objectContaining({
      title: "Tropass usage",
      message: expect.stringContaining("25%"),
    }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({variant: "info"}));
  });
});
