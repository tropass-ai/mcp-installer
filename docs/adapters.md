# Client Adapters

В этом репозитории главный переносимый слой - MCP. Agent-specific конфиги и инструкции генерирует installer, чтобы не хранить несколько расходящихся копий одних и тех же правил.

Рекомендуемый способ установки config + instructions для Codex, Claude и OpenCode:

```bash
npx -y @tropass/mcp-installer
```

Installer спросит MCP client и scope (`project` или `global`), затем запишет нативный MCP config, Tropass LLM provider и instruction/rules файл выбранного клиента.

Ручной direct remote config для клиентов, которые поддерживают remote MCP with custom headers:

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

Подробные пути для каждого клиента описаны в [install.md](install.md).

OpenCode хранит server payload в секции `mcp` файла `opencode.json` и требует `type: "remote"` и `enabled: true`.
