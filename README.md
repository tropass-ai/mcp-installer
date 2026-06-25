# @tropass/mcp-installer

CLI installer for configuring AI agents and developer tools to use the Tropass remote MCP gateway.

[Tropass](https://xn--80a1adciab.xn--p1ai/)

Tropass exposes the ML models available to a user as MCP tools, with JSON Schema input validation, structured model responses, and file-like inputs through existing Tropass/S3 file URLs.

## Install

Run the Ink-powered interactive installer:

```bash
npx -y @tropass/mcp-installer
```

The CLI asks for:

- MCP client: Codex, Claude, Cursor, or OpenCode;
- install scope: `project` or `global`;
- Tropass MCP URL;
- Tropass API token.

## Quick Commands

```bash
npx -y @tropass/mcp-installer codex
npx -y @tropass/mcp-installer cursor
npx -y @tropass/mcp-installer claude
npx -y @tropass/mcp-installer opencode
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
- Claude: `.mcp.json` and `CLAUDE.md`
- OpenCode: `opencode.json` and `AGENTS.md`

Global installs:

- Codex: `~/.codex/config.toml`, `~/.codex/skills/tropass-gateway/SKILL.md`, and `~/.codex/skills/agent-response-display/SKILL.md`
- Cursor: `~/.cursor/mcp.json` and `~/.cursor/rules/tropass-mcp.mdc`
- Claude: `~/.claude.json` and `~/.claude/CLAUDE.md`
- OpenCode: `~/.config/opencode/opencode.json` or `%APPDATA%\opencode\opencode.json`, and `AGENTS.md`

The installer preserves existing config entries and uses managed instruction blocks where native instruction files are shared with user content.

## Manual MCP Config

For clients that support remote MCP with custom headers:

```json
{
  "mcpServers": {
    "tropass": {
      "type": "http",
      "url": "https://xn--80aqu.xn--80a1adciab.xn--p1ai/mcp",
      "headers": {
        "X-API-TOKEN": "your-api-token"
      },
      "timeout": 900
    }
  }
}
```

OpenCode stores MCP servers under the `mcp` key in `opencode.json`:

```json
{
  "mcp": {
    "tropass": {
      "type": "remote",
      "enabled": true,
      "url": "https://xn--80aqu.xn--80a1adciab.xn--p1ai/mcp",
      "headers": {
        "X-API-TOKEN": "your-api-token"
      }
    }
  }
}
```

More details are available in [docs/install.md](docs/install.md).
