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

Claude project config:

```bash
npx -y @tropass/mcp-installer claude
```

OpenCode project config:

```bash
npx -y @tropass/mcp-installer opencode
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

По умолчанию installer спрашивает scope. С `--yes` используются defaults: `project` для Codex, Claude, Cursor и OpenCode.

Project install:

- Codex:
  - config: `.codex/config.toml` в текущем проекте;
  - instructions: `.codex/skills/tropass-gateway/SKILL.md`;
  - response display skill: `.codex/skills/agent-response-display/SKILL.md`;
- Cursor:
  - config: `.cursor/mcp.json` в текущем проекте;
  - instructions: `.cursor/rules/tropass-mcp.mdc`;
- Claude:
  - config: `.mcp.json` в текущем проекте;
  - instructions: `CLAUDE.md`;
- OpenCode:
  - config: `opencode.json` в текущем проекте;
  - instructions: `AGENTS.md`;
Global install:

- Codex:
  - config: `~/.codex/config.toml`;
  - instructions: `~/.codex/skills/tropass-gateway/SKILL.md`;
  - response display skill: `~/.codex/skills/agent-response-display/SKILL.md`;
- Cursor:
  - config: `~/.cursor/mcp.json`;
  - instructions: `~/.cursor/rules/tropass-mcp.mdc`;
- Claude:
  - config: `~/.claude.json`;
  - instructions: `~/.claude/CLAUDE.md`;
- OpenCode:
  - config on macOS/Linux: `~/.config/opencode/mcp.json`;
  - config on Windows: `%APPDATA%\opencode\mcp.json`;
  - instructions: `AGENTS.md` рядом с config;
Для `AGENTS.md`, `CLAUDE.md` и Codex `config.toml` installer использует managed block и не стирает существующие инструкции.

Можно указать путь явно:

```bash
npx -y @tropass/mcp-installer opencode --scope project --config ./my-mcp.json
```
