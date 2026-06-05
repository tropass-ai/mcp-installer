# tropass-agent-kit

`tropass-agent-kit` - open-source MCP connector kit для использования ML-моделей Tropass из AI-агентов, IDE и developer tools.

Репозиторий содержит документацию, локальный `stdio` proxy, примеры конфигурации и инструкции для агентов, которые подключаются к Tropass model gateway через MCP.

Tropass model gateway предоставляет доступные пользователю ML-модели как MCP tools: с учетом прав доступа, JSON Schema валидацией входных данных, структурированными ответами моделей и поддержкой файловых входов через существующие Tropass/S3 file URLs.

## Что внутри

- `packages/mcp-proxy` - локальный MCP `stdio` proxy для клиентов, которые не умеют напрямую подключаться к remote MCP server или задавать custom headers.
- `adapters/` - готовые конфиги для Codex, Claude Desktop, Cursor, VS Code и generic MCP clients.
- `adapters/generic/instructions.md` - vendor-neutral правила для точного и экономного использования Tropass MCP.
- `docs/` - auth, tools behavior, примеры подключения и диагностика.
- `scripts/smoke-check.mjs` - быстрая проверка токена и доступности MCP server.
- `server.json` - черновая metadata для публикации в MCP Registry.

## Быстрый старт

Для большинства агентов установите config одной командой:

```bash
npx -y @tropass/mcp-proxy install
```

CLI попросит выбрать MCP client, вставить Tropass API token и сохранит конфигурацию в нужный файл.

Быстрые варианты:

```bash
npx -y @tropass/mcp-proxy install cursor
npx -y @tropass/mcp-proxy install vscode
npx -y @tropass/mcp-proxy install claude-desktop
```

Ручной config для MCP-клиентов выглядит так:

```json
{
  "mcpServers": {
    "tropass": {
      "command": "npx",
      "args": ["-y", "@tropass/mcp-proxy"],
      "env": {
        "TROPASS_MCP_URL": "https://api.tropass.me/mcp",
        "TROPASS_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

Подробнее: [docs/install.md](docs/install.md).

Если агент умеет remote MCP with custom headers, можно подключаться напрямую:

```text
URL: https://api.tropass.me/mcp
Transport: Streamable HTTP
Header: X-API-TOKEN: <your-api-token>
```

## Проверка подключения

Из локальной копии репозитория:

```bash
TROPASS_MCP_URL="https://api.tropass.me/mcp" \
TROPASS_API_TOKEN="your-api-token" \
node scripts/smoke-check.mjs
```

Ожидаемый результат: успешный `initialize`, затем список доступных пользователю MCP tools.
