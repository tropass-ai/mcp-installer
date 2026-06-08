# Adapters

В этом репозитории главный переносимый слой - MCP. Все agent-specific файлы являются тонкими адаптерами.

## Generic remote config

Рекомендуемый способ установки config + instructions:

```bash
npx -y @tropass/mcp-installer
```

Ручной config:

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

## Vendor-specific files

- `adapters/codex` - Codex plugin с MCP config и skill.
- `adapters/claude` - пример `claude_desktop_config.json` и инструкции.
- `adapters/cursor` - пример `.cursor/mcp.json` и `.cursor/rules/tropass-mcp.mdc`.
- `adapters/vscode` - пример `.vscode/mcp.json` и `.github/copilot-instructions.md`.
- `adapters/generic` - vendor-neutral инструкции.
