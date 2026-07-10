# @tropass/mcp-installer

CLI-инсталлер для настройки AI-агентов на работу с удалёнными Tropass MCP и LLM gateway.

[Tropass](https://тропасс.рф/)

Tropass отдаёт доступные пользователю ML-модели как MCP tools: с JSON Schema валидацией входных параметров, структурированными ответами моделей и file-like аргументами через существующие Tropass/S3 URL файлов.

Также installer добавляет LLM provider `tropass`, чтобы поддерживаемые harness могли обращаться к моделям за `https://апи.ллм.тропасс.рф`; default model: `Qwen3.5-397B-A17B-FP8`.

## Установка

Запустите интерактивный инсталлер:

```bash
npx -y @tropass/mcp-installer
```

CLI спросит:

- MCP client: Codex, Claude или OpenCode;
- scope установки: `project` или `global`;
- Tropass MCP URL;
- Tropass API token.

## Быстрые Команды

```bash
npx -y @tropass/mcp-installer codex
npx -y @tropass/mcp-installer claude
npx -y @tropass/mcp-installer opencode
```

## Неинтерактивная Установка

```bash
npx -y @tropass/mcp-installer codex \
  --scope project \
  --url "https://апи.тропасс.рф/mcp" \
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
- Claude: `.mcp.json`, `.claude/settings.json` и `CLAUDE.md`
- OpenCode: `opencode.json` и `AGENTS.md`

Global install:

- Codex: `~/.codex/config.toml`, `~/.codex/skills/tropass-gateway/SKILL.md` и `~/.codex/skills/agent-response-display/SKILL.md`
- Claude: `~/.claude.json`, `~/.claude/settings.json` и `~/.claude/CLAUDE.md`
- OpenCode: `~/.config/opencode/opencode.json` или `%APPDATA%\opencode\opencode.json`, и `AGENTS.md`

Для Codex инсталлер вызывает `codex mcp add tropass --url ...`, затем записывает переданный token в `.codex/config.toml`. Для instruction-файлов инсталлер использует managed blocks, которые могут содержать пользовательский текст.

## Ручная MCP Конфигурация

Для Claude Code нужен явный HTTP server type:

```json
{
  "mcpServers": {
    "tropass": {
      "type": "http",
      "url": "https://апи.тропасс.рф/mcp",
      "headers": {
        "Authorization": "Bearer your-api-token"
      },
      "timeout": 900
    }
  }
}
```

OpenCode хранит MCP servers в секции `mcp` файла `opencode.json` и требует `type: "remote"` и `enabled: true`:

```json
{
  "mcp": {
    "tropass": {
      "type": "remote",
      "enabled": true,
      "url": "https://апи.тропасс.рф/mcp",
      "headers": {
        "Authorization": "Bearer your-api-token"
      }
    }
  }
}
```

Подробнее: [docs/install.md](docs/install.md).
