# tropass-agent-kit

`tropass-agent-kit` - open-source MCP connector kit для использования ML-моделей Tropass из AI-агентов, IDE и developer tools.

Репозиторий содержит installer, документацию, примеры конфигурации и инструкции для агентов, которые подключаются к Tropass model gateway через MCP.

Tropass model gateway предоставляет доступные пользователю ML-модели как MCP tools: с учетом прав доступа, JSON Schema валидацией входных данных, структурированными ответами моделей и поддержкой файловых входов через существующие Tropass/S3 file URLs.

## Что внутри

- `packages/mcp-installer` - CLI installer, который настраивает direct remote MCP config и инструкции под выбранного агента.
- `adapters/` - готовые конфиги для Codex, Claude, Cursor, VS Code и generic MCP clients.
- `packages/mcp-installer/instructions/tropass-mcp.md` - canonical vendor-neutral правила для точного и экономного использования Tropass MCP.
- `docs/` - auth, tools behavior, примеры подключения и диагностика.

## Быстрый старт

Для большинства агентов установите config одной командой:

```bash
npx -y @tropass/mcp-installer
```

CLI попросит выбрать MCP client, scope установки (`project` или `global`), вставить Tropass API token и сохранит конфигурацию и инструкции для агента в нужные файлы.

Быстрые варианты:

```bash
npx -y @tropass/mcp-installer codex
npx -y @tropass/mcp-installer cursor
npx -y @tropass/mcp-installer vscode
npx -y @tropass/mcp-installer claude
```

Ручной direct remote config для MCP-клиентов выглядит так:

```json
{
  "mcpServers": {
    "tropass": {
      "url": "https://xn--80aqu.xn--80a1adciab.xn--p1ai/mcp",
      "headers": {
        "X-API-TOKEN": "your-api-token"
      }
    }
  }
}
```

Подробнее: [docs/install.md](docs/install.md).

Installer считает direct remote MCP основным способом подключения.
