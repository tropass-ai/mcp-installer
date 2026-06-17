# @tropass/mcp-installer

CLI installer for configuring AI agents and developer tools to use the Tropass remote MCP gateway.

Tropass exposes the ML models available to a user as MCP tools, with JSON Schema input validation, structured model responses, and file-like inputs through existing Tropass/S3 file URLs.

## Install

Run the interactive installer:

```bash
npx -y @tropass/mcp-installer
```

The CLI asks for:

- MCP client: Codex, Cursor, VS Code, Claude, or generic;
- install scope: `project` or `global`;
- Tropass MCP URL;
- Tropass API token.

## Quick Commands

```bash
npx -y @tropass/mcp-installer codex
npx -y @tropass/mcp-installer cursor
npx -y @tropass/mcp-installer vscode
npx -y @tropass/mcp-installer claude
npx -y @tropass/mcp-installer generic
```

## Non-Interactive Install

```bash
npx -y @tropass/mcp-installer cursor \
  --scope project \
  --url "https://xn--80aqu.xn--80a1adciab.xn--p1ai/mcp" \
  --token "your-api-token" \
  --yes
```

Scope aliases are also available:

```bash
npx -y @tropass/mcp-installer codex --global --token "your-api-token" --yes
npx -y @tropass/mcp-installer codex --local --token "your-api-token" --yes
```

## What It Writes

Project installs:

- Codex: `.codex/config.toml`, `.codex/skills/tropass-gateway/SKILL.md`, and `.codex/skills/agent-response-display/SKILL.md`
- Cursor: `.cursor/mcp.json` and `.cursor/rules/tropass-mcp.mdc`
- VS Code: `.vscode/mcp.json` and `.github/copilot-instructions.md`
- Claude: `.mcp.json` and `CLAUDE.md`
- Generic: `mcp.json` and `AGENTS.md`

Global installs:

- Codex: `~/.codex/config.toml`, `~/.codex/skills/tropass-gateway/SKILL.md`, and `~/.codex/skills/agent-response-display/SKILL.md`
- Cursor: `~/.cursor/mcp.json` and `~/.cursor/rules/tropass-mcp.mdc`
- VS Code: user `mcp.json` and `copilot-instructions.md`
- Claude: Claude desktop config and `tropass-mcp-instructions.md`
- Generic: user config under `~/.config/mcp-installer/` or `%APPDATA%\mcp-installer\`

The installer preserves existing config entries and uses managed instruction blocks where native instruction files are shared with user content.

## Manual MCP Config

For clients that support remote MCP with custom headers:

```json
{
  "mcpServers": {
    "tropass": {
      "url": "https://xn--80aqu.xn--80a1adciab.xn--p1ai/mcp",
      "headers": {
        "X-API-TOKEN": "your-api-token"
      },
      "timeout": 900
    }
  }
}
```

More details are available in [docs/install.md](docs/install.md).
