# Install

Пользователь может установить Tropass MCP config и инструкции для агента одной командой:

```bash
npx -y @tropass/mcp-installer
```

CLI спросит:

- MCP client;
- install scope: project или global;
- Tropass MCP URL;
- Tropass API token.

Затем CLI сохранит:

- MCP server config в конфигурационный файл выбранного клиента;
- инструкции по работе с Tropass MCP в native instruction/rules файл выбранного клиента.

## Быстрые команды

Codex project config:

```bash
npx -y @tropass/mcp-installer codex
```

Cursor project config:

```bash
npx -y @tropass/mcp-installer cursor
```

VS Code workspace config:

```bash
npx -y @tropass/mcp-installer vscode
```

Claude project config:

```bash
npx -y @tropass/mcp-installer claude
```

OpenCode project config:

```bash
npx -y @tropass/mcp-installer opencode
```

Generic `mcp.json` в текущей директории:

```bash
npx -y @tropass/mcp-installer generic
```

## Non-interactive install

```bash
npx -y @tropass/mcp-installer cursor \
  --scope project \
  --url "https://xn--80aqu.xn--80a1adciab.xn--p1ai/mcp" \
  --token "your-api-token" \
  --yes
```

Можно использовать алиасы:

```bash
npx -y @tropass/mcp-installer codex --global --token "your-api-token" --yes
npx -y @tropass/mcp-installer codex --local --token "your-api-token" --yes
```

## Куда пишутся файлы

По умолчанию installer спрашивает scope. С `--yes` используются defaults: `project` для Codex, Claude, Cursor, OpenCode, VS Code и generic.

Project install:

- Codex:
  - config: `.codex/config.toml` в текущем проекте;
  - instructions: `.codex/skills/tropass-gateway/SKILL.md`;
  - response display skill: `.codex/skills/agent-response-display/SKILL.md`;
- Cursor:
  - config: `.cursor/mcp.json` в текущем проекте;
  - instructions: `.cursor/rules/tropass-mcp.mdc`;
- VS Code:
  - config: `.vscode/mcp.json` в текущем workspace;
  - instructions: `.github/copilot-instructions.md`;
- Claude:
  - config: `.mcp.json` в текущем проекте;
  - instructions: `CLAUDE.md`;
- OpenCode:
  - config: `opencode.json` в текущем проекте;
  - instructions: `AGENTS.md`;
- generic:
  - config: `mcp.json` в текущей директории;
  - instructions: `AGENTS.md` в текущей директории.

Global install:

- Codex:
  - config: `~/.codex/config.toml`;
  - instructions: `~/.codex/skills/tropass-gateway/SKILL.md`;
  - response display skill: `~/.codex/skills/agent-response-display/SKILL.md`;
- Cursor:
  - config: `~/.cursor/mcp.json`;
  - instructions: `~/.cursor/rules/tropass-mcp.mdc`;
- VS Code:
  - config on macOS: `~/Library/Application Support/Code/User/mcp.json`;
  - config on Windows: `%APPDATA%\Code\User\mcp.json`;
  - config on Linux: `~/.config/Code/User/mcp.json`;
  - instructions: `copilot-instructions.md` рядом с user config;
- Claude:
  - config on macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`;
  - config on Windows: `%APPDATA%\Claude\claude_desktop_config.json`;
  - config on Linux: `~/.config/Claude/claude_desktop_config.json`;
  - instructions: `tropass-mcp-instructions.md` рядом с config;
- OpenCode:
  - config on macOS/Linux: `~/.config/opencode/mcp.json`;
  - config on Windows: `%APPDATA%\opencode\mcp.json`;
  - instructions: `AGENTS.md` рядом с config;
- generic:
  - config on macOS/Linux: `~/.config/mcp-installer/mcp.json`;
  - config on Windows: `%APPDATA%\mcp-installer\mcp.json`;
  - instructions: `AGENTS.md` рядом с config.

Для `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, VS Code user instructions и Codex `config.toml` installer использует managed block и не стирает существующие инструкции.

Можно указать путь явно:

```bash
npx -y @tropass/mcp-installer generic --scope project --config ./my-mcp.json
```
