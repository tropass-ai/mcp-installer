import process from "node:process";

import { Box, render, Text, useApp, useInput, usePaste } from "ink";
import Link from "ink-link";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
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
  mcpUrl: string;
  llmUrl: string;
  apiToken: string;
};

type Step = "scope" | "mcp-url" | "llm-url" | "token";

const SCOPE_ITEMS: Array<{ label: string; value: InstallScope }> = [
  { label: "Project — configure the current workspace", value: "project" },
  { label: "Global — configure this user account", value: "global" }
];

export async function runInteractiveInstaller(
  options: InteractiveInstallOptions
): Promise<CompletedInstallOptions> {
  if (options.yes && options.client && options.scope && options.apiToken) {
    return {
      client: options.client,
      scope: options.scope,
      mcpUrl: options.mcpUrl,
      llmUrl: options.llmUrl,
      apiToken: options.apiToken
    };
  }

  if (!process.stdin.isTTY) {
    throw new Error("Interactive installation requires a TTY. Pass --client, --scope, --token, and --yes.");
  }

  let completedOptions: CompletedInstallOptions | undefined;
  const instance = render(
    <InstallerWizard options={options} onComplete={(result) => { completedOptions = result; }} />,
    { stdin: process.stdin, stdout: process.stderr }
  );
  await instance.waitUntilExit();

  if (!completedOptions) {
    throw new Error("Installation cancelled.");
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
  const [mcpUrl, setMcpUrl] = useState(options.mcpUrl);
  const [llmUrl, setLlmUrl] = useState(options.llmUrl);
  const [apiToken, setApiToken] = useState(options.apiToken ?? "");
  const [mcpUrlConfirmed, setMcpUrlConfirmed] = useState(options.yes);
  const [llmUrlConfirmed, setLlmUrlConfirmed] = useState(options.yes);

  const step = resolveStep({ scope, mcpUrlConfirmed, llmUrlConfirmed });

  const complete = (values: {
    client: InstallClient | undefined;
    scope: InstallScope | undefined;
    mcpUrl: string;
    llmUrl: string;
    apiToken: string;
  }, confirmedMcpUrl = mcpUrlConfirmed, confirmedLlmUrl = llmUrlConfirmed): void => {
    if (values.client && values.scope && values.apiToken && confirmedMcpUrl && confirmedLlmUrl) {
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
    complete({ client, scope, mcpUrl, llmUrl, apiToken: token });
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Link url={TROPASS_URL}>
          <Text bold color="cyan" underline>Tropass</Text>
        </Link>
        <Text bold color="cyan"> MCP Installer</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {step === "scope" && (
          <>
            <Text bold>Select an install scope</Text>
            <SelectInput
              items={SCOPE_ITEMS}
              onSelect={(item) => {
                setScope(item.value);
                complete({ client, scope: item.value, mcpUrl, llmUrl, apiToken });
              }}
            />
          </>
        )}
        {step === "mcp-url" && (
          <>
            <Text bold>Tropass model API gateway URL</Text>
            <TextInput
              value={mcpUrl}
              onChange={setMcpUrl}
              onSubmit={(value) => {
                if (value.trim()) {
                  const confirmedUrl = value.trim();
                  setMcpUrl(confirmedUrl);
                  setMcpUrlConfirmed(true);
                  complete({ client, scope, mcpUrl: confirmedUrl, llmUrl, apiToken }, true);
                }
              }}
            />
          </>
        )}
        {step === "llm-url" && (
          <>
            <Text bold>Tropass LLM gateway URL</Text>
            <TextInput
              value={llmUrl}
              onChange={setLlmUrl}
              onSubmit={(value) => {
                if (value.trim()) {
                  const confirmedUrl = value.trim().replace(/\/+$/, "");
                  setLlmUrl(confirmedUrl);
                  setLlmUrlConfirmed(true);
                  complete({ client, scope, mcpUrl, llmUrl: confirmedUrl, apiToken }, mcpUrlConfirmed, true);
                }
              }}
            />
          </>
        )}
        {step === "token" && (
          <>
            <Text bold>Tropass API token</Text>
            <TokenInput value={apiToken} onChange={setApiToken} onSubmit={submitToken} />
          </>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Use ↑/↓ and Enter to continue · Ctrl+C to cancel</Text>
      </Box>
    </Box>
  );

  function resolveStep(values: {
    scope: InstallScope | undefined;
    mcpUrlConfirmed: boolean;
    llmUrlConfirmed: boolean;
  }): Step {
    if (!values.scope) return "scope";
    if (!values.mcpUrlConfirmed) return "mcp-url";
    if (!values.llmUrlConfirmed) return "llm-url";
    return "token";
  }
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

function InstallResultView({ result }: { result: InstallResult }): React.JSX.Element {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="green" bold>✓ Tropass MCP installed for {result.client}</Text>
      <Text>Scope: {result.scope}</Text>
      <Text>Config: {result.configPath}</Text>
      <Text>Skills: {result.skillPaths.join(", ")}</Text>
      <Text dimColor>Restart or reload your MCP client to pick up the new server.</Text>
      <Text dimColor>
        Tropass: <Link url={TROPASS_URL}>open website</Link>
      </Text>
    </Box>
  );
}
