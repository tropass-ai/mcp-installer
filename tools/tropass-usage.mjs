const decode = (value) => Buffer.from(value, "base64").toString();
const url = decode("{{USAGE_URL}}");
const token = decode("{{API_TOKEN}}");

export function formatUsage(data, locale, timeZone) {
  const usage = data?.usage ?? data?.data ?? data;
  const used = Number(usage?.used ?? usage?.used_tokens);
  const limit = Number(usage?.limit ?? usage?.limit_tokens);
  const remaining = Number(usage?.remaining ?? usage?.remaining_tokens);
  const reset = usage?.reset_at ?? usage?.resetAt ?? usage?.reset_time;
  if (![used, limit, remaining].every(Number.isFinite) || reset === undefined) {
    return JSON.stringify(data, null, 2);
  }

  const percent = Math.min(100, Math.max(0, limit > 0 ? Math.round(used / limit * 100) : 0));
  const filled = Math.round(percent * 24 / 100);
  const number = new Intl.NumberFormat(locale).format;
  const resetDate = new Date(typeof reset === "number" && reset < 1e12 ? reset * 1000 : reset);
  const resetText = Number.isNaN(resetDate.valueOf())
    ? String(reset)
    : new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short", timeZone}).format(resetDate);

  return [
    "Weekly tokens",
    "",
    `${"█".repeat(filled)}${"░".repeat(24 - filled)} ${percent}%`,
    "",
    `Used       ${number(used)}`,
    `Remaining  ${number(remaining)}`,
    `Limit      ${number(limit)}`,
    `Resets     ${resetText}`,
  ].join("\n");
}

export default {
  id: "tropass.usage",
  async tui(api) {
    api.keymap.registerLayer({
      mode: "base",
      commands: [{
        name: "tropass.usage",
        title: "Tropass token usage",
        category: "Tropass",
        namespace: "palette",
        slashName: "usage",
        async run() {
          try {
            api.ui.toast({variant: "info", message: "Loading Tropass usage…", duration: 2_000});
            const response = await fetch(url, {headers: {Authorization: `Bearer ${token}`}});
            const body = await response.text();
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${body}`);
            let message = body;
            try {
              message = formatUsage(JSON.parse(body));
            } catch {}
            await api.ui.DialogAlert.show(api.ui.dialog, "Tropass usage", message);
          } catch (error) {
            api.ui.toast({
              variant: "error",
              message: error instanceof Error ? error.message : String(error),
              duration: 10_000,
            });
          }
        },
      }],
    });
  },
};
