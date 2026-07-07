# @tropass/mcp-installer

CLI-инсталлер для настройки AI-агентов на работу с удалённым Tropass MCP gateway.

[Tropass](https://xn--80a1adciab.xn--p1ai/)

Tropass отдаёт доступные пользователю ML-модели как MCP tools: с JSON Schema валидацией входных параметров, структурированными ответами моделей и file-like аргументами через существующие Tropass/S3 URL файлов.

## Установка

Запустите интерактивный инсталлер:

```bash
npx -y @tropass/mcp-installer
```

CLI спросит:

- MCP client: Codex, Claude, Cursor или OpenCode;
- scope установки: `project` или `global`;
- Tropass MCP URL;
- Tropass API token.

## Быстрые Команды

```bash
npx -y @tropass/mcp-installer codex
npx -y @tropass/mcp-installer cursor
npx -y @tropass/mcp-installer claude
npx -y @tropass/mcp-installer opencode
```

## Неинтерактивная Установка

```bash
npx -y @tropass/mcp-installer cursor \
  --scope project \
  --url "https://xn--80aqu.xn--80a1adciab.xn--p1ai/mcp" \
  --token "your-api-token" \
  --yes
```

Также доступны алиасы scope:

```bash
npx -y @tropass/mcp-installer codex --global --token "your-api-token" --yes
npx -y @tropass/mcp-installer codex --local --token "your-api-token" --yes
```

## Какие Файлы Создаются

Project install:

- Codex: `.codex/config.toml`, `.codex/skills/tropass-gateway/SKILL.md` и `.codex/skills/agent-response-display/SKILL.md`
- Cursor: `.cursor/mcp.json` и `.cursor/rules/tropass-mcp.mdc`
- Claude: `.mcp.json` и `CLAUDE.md`
- OpenCode: `opencode.json` и `AGENTS.md`

Global install:

- Codex: `~/.codex/config.toml`, `~/.codex/skills/tropass-gateway/SKILL.md` и `~/.codex/skills/agent-response-display/SKILL.md`
- Cursor: `~/.cursor/mcp.json` и `~/.cursor/rules/tropass-mcp.mdc`
- Claude: `~/.claude.json` и `~/.claude/CLAUDE.md`
- OpenCode: `~/.config/opencode/opencode.json` или `%APPDATA%\opencode\opencode.json`, и `AGENTS.md`

Инсталлер сохраняет существующие config entries и использует managed blocks для instruction-файлов, которые могут содержать пользовательский текст.

## Ручная MCP Конфигурация

Для Claude Code нужен явный HTTP server type:

```json
{
  "mcpServers": {
    "tropass": {
      "type": "http",
      "url": "https://xn--80aqu.xn--80a1adciab.xn--p1ai/mcp",
      "headers": {
        "Authorization": "Bearer your-api-token"
      },
      "timeout": 900
    }
  }
}
```

Cursor использует такой же `mcpServers` формат. Если конкретная версия Cursor не принимает `type`, удалите поле `"type": "http"`.

OpenCode хранит MCP servers в секции `mcp` файла `opencode.json` и требует `type: "remote"` и `enabled: true`:

```json
{
  "mcp": {
    "tropass": {
      "type": "remote",
      "enabled": true,
      "url": "https://xn--80aqu.xn--80a1adciab.xn--p1ai/mcp",
      "headers": {
        "Authorization": "Bearer your-api-token"
      }
    }
  }
}
```

Подробнее: [docs/install.md](docs/install.md).
