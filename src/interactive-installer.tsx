import process from "node:process";

import { Box, render, Text, useApp } from "ink";
import Link from "ink-link";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { useState } from "react";

import { TROPASS_URL } from "./constants.js";
import type { InstallClient, InstallOptions, InstallResult, InstallScope } from "./types.js";

type InteractiveInstallOptions = Omit<InstallOptions, "client" | "scope"> & {
  client: InstallClient | undefined;
  scope: InstallScope | undefined;
};

type CompletedInstallOptions = {
  client: InstallClient;
  scope: InstallScope;
  mcpUrl: string;
  apiToken: string;
};

type Step = "client" | "scope" | "url" | "token";

const CLIENT_ITEMS: Array<{ label: string; value: InstallClient }> = [
  { label: "Codex", value: "codex" },
  { label: "Claude", value: "claude" },
  { label: "Cursor", value: "cursor" },
  { label: "VS Code", value: "vscode" },
  { label: "Generic MCP client", value: "generic" }
];

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
  const [client, setClient] = useState(options.client);
  const [scope, setScope] = useState(options.scope);
  const [mcpUrl, setMcpUrl] = useState(options.mcpUrl);
  const [apiToken, setApiToken] = useState(options.apiToken ?? "");
  const [urlConfirmed, setUrlConfirmed] = useState(options.yes);

  const step = resolveStep({ client, scope, urlConfirmed });

  const complete = (values: {
    client: InstallClient | undefined;
    scope: InstallScope | undefined;
    mcpUrl: string;
    apiToken: string;
  }, confirmedUrl = urlConfirmed): void => {
    if (values.client && values.scope && values.apiToken && confirmedUrl) {
      onComplete({ ...values, client: values.client, scope: values.scope, apiToken: values.apiToken });
      exit();
    }
  };

  const selectClient = (item: { value: InstallClient }): void => {
    const selectedScope = scope ?? (options.yes ? defaultScopeForClient(item.value) : undefined);
    setClient(item.value);
    if (selectedScope) {
      setScope(selectedScope);
    }
    complete({ client: item.value, scope: selectedScope, mcpUrl, apiToken });
  };

  const submitToken = (value: string): void => {
    const token = value.trim();
    if (!token) {
      return;
    }
    setApiToken(token);
    complete({ client, scope, mcpUrl, apiToken: token });
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
        {step === "client" && (
          <>
            <Text bold>Select an MCP client</Text>
            <SelectInput items={CLIENT_ITEMS} onSelect={selectClient} />
          </>
        )}
        {step === "scope" && (
          <>
            <Text bold>Select an install scope</Text>
            <SelectInput
              items={SCOPE_ITEMS}
              onSelect={(item) => {
                setScope(item.value);
                complete({ client, scope: item.value, mcpUrl, apiToken });
              }}
            />
          </>
        )}
        {step === "url" && (
          <>
            <Text bold>Tropass MCP URL</Text>
            <TextInput
              value={mcpUrl}
              onChange={setMcpUrl}
              onSubmit={(value) => {
                if (value.trim()) {
                  const confirmedUrl = value.trim();
                  setMcpUrl(confirmedUrl);
                  setUrlConfirmed(true);
                  complete({ client, scope, mcpUrl: confirmedUrl, apiToken }, true);
                }
              }}
            />
          </>
        )}
        {step === "token" && (
          <>
            <Text bold>Tropass API token</Text>
            <TextInput value={apiToken} onChange={setApiToken} onSubmit={submitToken} mask="*" />
          </>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Use ↑/↓ and Enter to continue · Ctrl+C to cancel</Text>
      </Box>
    </Box>
  );

  function resolveStep(values: {
    client: InstallClient | undefined;
    scope: InstallScope | undefined;
    urlConfirmed: boolean;
  }): Step {
    if (!values.client) return "client";
    if (!values.scope) return "scope";
    if (!values.urlConfirmed) return "url";
    return "token";
  }
}

function defaultScopeForClient(client: InstallClient): InstallScope {
  return client === "claude" ? "global" : "project";
}

function InstallResultView({ result }: { result: InstallResult }): React.JSX.Element {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="green" bold>✓ Tropass MCP installed for {result.client}</Text>
      <Text>Scope: {result.scope}</Text>
      <Text>Config: {result.configPath}</Text>
      <Text>Instructions: {result.instructionPath}</Text>
      <Text dimColor>Restart or reload your MCP client to pick up the new server.</Text>
      <Text dimColor>
        Tropass: <Link url={TROPASS_URL}>open website</Link>
      </Text>
    </Box>
  );
}
