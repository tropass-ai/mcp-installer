import process from "node:process";

import { Box, render, Text, useApp, useInput, usePaste } from "ink";
import Link from "ink-link";
import SelectInput from "ink-select-input";
import { useRef, useState } from "react";

import { TROPASS_URL } from "./constants.js";
import type { InstallClient, InstallOptions, InstallResult, InstallScope } from "./types.js";

type InteractiveInstallOptions = Omit<InstallOptions, "client" | "scope"> & {
  client: InstallClient;
  scope: InstallScope | undefined;
};

type CompletedInstallOptions = {
  client: InstallClient;
  scope: InstallScope;
  apiToken: string;
};

const SCOPE_ITEMS: Array<{ label: string; value: InstallScope }> = [
  { label: "Глобально — для текущего пользователя", value: "global" },
  { label: "Проект — для текущего рабочего пространства", value: "project" }
];

export async function runInteractiveInstaller(
  options: InteractiveInstallOptions
): Promise<CompletedInstallOptions> {
  if (options.yes && options.client && options.scope && options.apiToken) {
    return {
      client: options.client,
      scope: options.scope,
      apiToken: options.apiToken
    };
  }

  if (!process.stdin.isTTY) {
    throw new Error("Для интерактивной установки нужен TTY. Передайте --client, --scope, --token и --yes.");
  }

  let completedOptions: CompletedInstallOptions | undefined;
  const instance = render(
    <InstallerWizard options={options} onComplete={(result) => { completedOptions = result; }} />,
    { stdin: process.stdin, stdout: process.stderr }
  );
  await instance.waitUntilExit();

  if (!completedOptions) {
    throw new Error("Установка отменена.");
  }
  return completedOptions;
}

export function writeInstallResult(result: InstallResult): void {
  const instance = render(<InstallResultView result={result} />, { stdout: process.stderr });
  instance.unmount();
}

function InstallerWizard({
  options,
  onComplete
}: {
  options: InteractiveInstallOptions;
  onComplete: (options: CompletedInstallOptions) => void;
}): React.JSX.Element {
  const { exit } = useApp();
  const client = options.client;
  const [scope, setScope] = useState(options.scope);
  const [apiToken, setApiToken] = useState(options.apiToken ?? "");
  const step = scope ? "token" : "scope";

  const complete = (values: {
    client: InstallClient | undefined;
    scope: InstallScope | undefined;
    apiToken: string;
  }): void => {
    if (values.client && values.scope && values.apiToken) {
      onComplete({ ...values, client: values.client, scope: values.scope, apiToken: values.apiToken });
      exit();
    }
  };

  const submitToken = (value: string): void => {
    const token = value.trim();
    if (!token) {
      return;
    }
    setApiToken(token);
    complete({ client, scope, apiToken: token });
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Link url={TROPASS_URL}>
          <Text bold color="cyan" underline>Tropass</Text>
        </Link>
        <Text bold color="cyan"> Установщик MCP</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {step === "scope" && (
          <>
            <Text bold>Выберите область установки</Text>
            <SelectInput
              items={SCOPE_ITEMS}
              onSelect={(item) => {
                setScope(item.value);
                complete({ client, scope: item.value, apiToken });
              }}
            />
          </>
        )}
        {step === "token" && (
          <>
            <Text bold>API-токен Tropass</Text>
            <TokenInput value={apiToken} onChange={setApiToken} onSubmit={submitToken} />
          </>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Используйте ↑/↓ и Enter · Ctrl+C для отмены</Text>
      </Box>
    </Box>
  );
}

function TokenInput({
  value,
  onChange,
  onSubmit
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}): React.JSX.Element {
  const valueRef = useRef(value);
  valueRef.current = value;

  useInput((input, key) => {
    if (key.return) {
      onSubmit(valueRef.current);
      return;
    }
    if (key.backspace || key.delete) {
      const next = valueRef.current.slice(0, -1);
      valueRef.current = next;
      onChange(next);
      return;
    }
    if (
      key.upArrow
      || key.downArrow
      || key.leftArrow
      || key.rightArrow
      || key.tab
      || key.escape
      || key.ctrl
      || key.meta
    ) {
      return;
    }
    const next = valueRef.current + input;
    valueRef.current = next;
    onChange(next);
  });

  usePaste((text) => {
    const next = valueRef.current + text.replace(/[\r\n\t]+/g, "");
    valueRef.current = next;
    onChange(next);
  });

  return <Text>{value.length > 0 ? "*".repeat(value.length) : " "}</Text>;
}

function UvStatusLine({ result }: { result: InstallResult }): React.JSX.Element {
  if (result.uvxCommand) {
    return <Text>uvx: {result.uvxCommand}</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text color="yellow">
        uvx не найден — MCP настроен на синхронный режим v1 без инструмента wait_for_model_task.
      </Text>
      <Text dimColor>
        Поставьте uv и повторите установку, чтобы включить асинхронный режим v2:
        https://docs.astral.sh/uv/getting-started/installation/
      </Text>
    </Box>
  );
}

function InstallResultView({ result }: { result: InstallResult }): React.JSX.Element {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="green" bold>✓ Tropass MCP настроен для {result.client}</Text>
      <Text>Область: {result.scope}</Text>
      <Text>Конфигурация: {result.configPath}</Text>
      <Text>Инструкции агента: {result.skillPaths.join(", ")}</Text>
      {result.toolPaths.length
        ? <Text>Инструменты агента: {result.toolPaths.join(", ")}</Text>
        : <Text>Инструменты агента: не нужны в синхронном режиме</Text>}
      {result.removedToolPaths.length
        ? <Text dimColor>Удалены инструменты прошлой установки: {result.removedToolPaths.join(", ")}</Text>
        : null}
      <Text>Вызов моделей: {result.modelCallVersion === "2" ? "асинхронный (v2)" : "синхронный (v1)"}</Text>
      <Text>Плагины OpenCode: {result.pluginPaths.join(", ")}</Text>
      <UvStatusLine result={result} />
      <Text dimColor>Перезапустите или перезагрузите MCP-клиент.</Text>
      <Text dimColor>
        Tropass: <Link url={TROPASS_URL}>открыть сайт</Link>
      </Text>
    </Box>
  );
}
