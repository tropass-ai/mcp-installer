# Client Adapters

В этом репозитории главный переносимый слой - MCP. Agent-specific конфиги и инструкции генерирует installer, чтобы не хранить несколько расходящихся копий одних и тех же правил.

Рекомендуемый способ установки config + instructions для Codex, Claude, Cursor и OpenCode:

```bash
npx -y @tropass/mcp-installer
```

Installer спросит MCP client и scope (`project` или `global`), затем запишет нативный config и instruction/rules файл выбранного клиента.

Ручной direct remote config для клиентов, которые поддерживают remote MCP with custom headers:

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

Подробные пути для каждого клиента описаны в [install.md](install.md).

OpenCode хранит server payload в секции `mcp` файла `opencode.json` и требует `type: "remote"` и `enabled: true`.
