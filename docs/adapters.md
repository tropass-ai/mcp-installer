# Adapters

В этом репозитории главный переносимый слой - MCP. Все agent-specific файлы являются тонкими адаптерами.

## Generic stdio config

Рекомендуемый способ установки:

```bash
npx -y @tropass/mcp-proxy install
```

Ручной config:

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

## Direct remote config

Используйте только если клиент поддерживает Streamable HTTP MCP и custom headers:

```json
{
  "mcpServers": {
    "tropass": {
      "url": "https://api.tropass.me/mcp",
      "headers": {
        "X-API-TOKEN": "your-api-token"
      }
    }
  }
}
```

## Vendor-specific files

- `adapters/codex-plugin` - Codex plugin с MCP config и skill.
- `adapters/claude-desktop` - пример `claude_desktop_config.json`.
- `adapters/cursor` - пример `.cursor/mcp.json`.
- `adapters/vscode` - пример `.vscode/mcp.json`.
- `adapters/generic` - vendor-neutral инструкции.
