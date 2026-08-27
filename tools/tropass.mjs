import {spawn} from "node:child_process";
import process from "node:process";

const decode = (value) => Buffer.from(value, "base64").toString();
const usageUrl = decode("{{USAGE_URL}}");
const apiToken = decode("{{API_TOKEN}}");
const configPath = decode("{{CONFIG_PATH}}");
const projectDir = decode("{{PROJECT_DIR}}");
const currentVersion = "{{INSTALLER_VERSION}}";
const installScope = "{{INSTALL_SCOPE}}";
const installerPackage = "@tropass/connect@latest";
const registryUrl = "https://registry.npmjs.org/@tropass%2Fconnect/latest";
const remindAfterKey = "tropass.update.remindAfter";
const updateCheckKey = Symbol.for("tropass.update.checkStarted");

export const REMIND_DELAY_MS = 24 * 60 * 60 * 1000;

export function formatUsage(data, locale, timeZone) {
  const usage = data?.usage ?? data?.data ?? data;
  const used = Number(usage?.used ?? usage?.used_tokens);
  const limitValue = usage?.limit ?? usage?.limit_tokens ?? usage?.initial_limit_tokens;
  const remainingValue = usage?.remaining ?? usage?.remaining_tokens;
  const limit = limitValue === null ? null : Number(limitValue);
  const remaining = remainingValue === null ? null : Number(remainingValue);
  const reset = usage?.resetAt ?? usage?.reset_time ?? usage?.reset_at;
  if (!Number.isFinite(used) || (limit !== null && !Number.isFinite(limit)) || (remaining !== null && !Number.isFinite(remaining)) || reset === undefined) {
    return JSON.stringify(data, null, 2);
  }

  const percent = limit === null ? null : Math.min(100, Math.max(0, limit > 0 ? Math.round(used / limit * 100) : 0));
  const filled = percent === null ? 0 : Math.round(percent * 24 / 100);
  const number = new Intl.NumberFormat(locale).format;
  const resetDate = new Date(typeof reset === "number" && reset < 1e12 ? reset * 1000 : reset);
  const resetText = reset === null ? "Not scheduled" : Number.isNaN(resetDate.valueOf())
    ? String(reset)
    : new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short", timeZone}).format(resetDate);

  return [
    "Weekly tokens",
    "",
    percent === null ? "──────────────────────── ∞" : `${"█".repeat(filled)}${"░".repeat(24 - filled)} ${percent}%`,
    "",
    `Used       ${number(used)}`,
    `Remaining  ${remaining === null ? "Unlimited" : number(remaining)}`,
    `Limit      ${limit === null ? "Unlimited" : number(limit)}`,
    `Resets     ${resetText}`,
  ].join("\n");
}

export function isNewerVersion(candidate, installed) {
  const candidateParts = parseStableVersion(candidate);
  const installedParts = parseStableVersion(installed);
  if (!candidateParts || !installedParts) return false;

  for (let index = 0; index < candidateParts.length; index += 1) {
    if (candidateParts[index] !== installedParts[index]) {
      return candidateParts[index] > installedParts[index];
    }
  }
  return false;
}

export function buildUpdateCommand({
  packageSpec = installerPackage,
  scope = installScope,
  configuration = configPath,
  project = projectDir,
  platform = process.platform,
} = {}) {
  return {
    command: platform === "win32" ? "npx.cmd" : "npx",
    args: [
      "-y",
      packageSpec,
      "opencode",
      "--scope",
      scope,
      "--config",
      configuration,
      ...(project ? ["--project", project] : []),
      "--yes",
    ],
    cwd: project || undefined,
  };
}

export function runInstallerUpdate(spawnProcess = spawn, updateCommand = buildUpdateCommand()) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(updateCommand.command, updateCommand.args, {
      cwd: updateCommand.cwd,
      env: {...process.env, TROPASS_API_TOKEN: apiToken},
      shell: false,
      stdio: "ignore",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("close", (exitCode) => resolve(exitCode === 0));
  });
}

export async function checkForUpdate(api, {
  fetchLatestVersion = retrieveLatestVersion,
  installUpdate = runInstallerUpdate,
  now = Date.now,
  version = currentVersion,
} = {}) {
  if (globalThis[updateCheckKey]) return;
  globalThis[updateCheckKey] = true;

  if (!await waitForKv(api)) return;
  const remindAfter = Number(api.kv.get(remindAfterKey, 0));
  if (Number.isFinite(remindAfter) && remindAfter > now()) return;

  try {
    const latestVersion = await fetchLatestVersion();
    if (!isNewerVersion(latestVersion, version)) return;
    showUpdateDialog(api, version, latestVersion, installUpdate, now);
  } catch {}
}

function parseStableVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return match?.slice(1).map(Number);
}

async function waitForKv(api) {
  while (!api.kv.ready) {
    if (api.lifecycle?.signal.aborted) return false;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return true;
}

async function retrieveLatestVersion() {
  const response = await fetch(registryUrl, {signal: AbortSignal.timeout(3_000)});
  if (!response.ok) return undefined;
  const payload = await response.json();
  return typeof payload?.version === "string" ? payload.version : undefined;
}

function showUpdateDialog(api, installedVersion, latestVersion, installUpdate, now) {
  let handled = false;
  const remindTomorrow = () => api.kv.set(remindAfterKey, now() + REMIND_DELAY_MS);

  api.ui.dialog.replace(
    () => api.ui.DialogSelect({
      title: `Обновление Tropass ${installedVersion} → ${latestVersion}`,
      options: [
        {
          title: "Обновить сейчас",
          value: "update",
          description: "Обновить конфигурацию и плагины Tropass",
        },
        {
          title: "Напомнить завтра",
          value: "later",
          description: "Скрыть предложение на 24 часа",
        },
      ],
      current: "update",
      flat: true,
      skipFilter: true,
      onSelect(option) {
        handled = true;
        api.ui.dialog.clear();
        if (option.value === "later") {
          remindTomorrow();
          return;
        }
        void installWithFeedback(api, installUpdate);
      },
    }),
    () => {
      if (!handled) remindTomorrow();
    },
  );
}

async function installWithFeedback(api, installUpdate) {
  api.ui.toast({
    variant: "info",
    message: "Обновляем Tropass…",
    duration: 30_000,
  });

  try {
    if (!await installUpdate()) throw new Error("Установщик завершился с ошибкой.");
    api.ui.dialog.replace(() => api.ui.DialogAlert({
      title: "Tropass обновлён",
      message: "Перезапустите OpenCode, чтобы применить обновление.",
      onConfirm: () => api.ui.dialog.clear(),
    }));
  } catch (error) {
    api.ui.toast({
      variant: "error",
      message: error instanceof Error ? error.message : "Не удалось обновить Tropass.",
      duration: 10_000,
    });
  }
}

function registerUsage(api) {
  const run = async () => {
    try {
      api.ui.toast({variant: "info", message: "Loading Tropass usage…", duration: 2_000});
      const response = await fetch(usageUrl, {headers: {Authorization: `Bearer ${apiToken}`}});
      const body = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${body}`);
      let message = body;
      try {
        message = formatUsage(JSON.parse(body));
      } catch {}
      api.ui.dialog.replace(() => api.ui.DialogAlert({
        title: "Tropass usage",
        message,
        onConfirm: () => api.ui.dialog.clear(),
      }));
    } catch (error) {
      api.ui.toast({
        variant: "error",
        message: error instanceof Error ? error.message : String(error),
        duration: 10_000,
      });
    }
  };

  if (api.command) {
    api.command.register(() => [{
      title: "Tropass token usage",
      value: "tropass.usage",
      category: "Tropass",
      slash: {name: "usage"},
      onSelect: run,
    }]);
    return;
  }

  api.keymap.registerLayer({
    mode: "base",
    commands: [{
      name: "tropass.usage",
      title: "Tropass token usage",
      category: "Tropass",
      namespace: "palette",
      slashName: "usage",
      run,
    }],
  });
}

export default {
  id: "tropass",
  async tui(api) {
    registerUsage(api);
    if (api.kv && api.ui.DialogSelect) void checkForUpdate(api);
  },
};
