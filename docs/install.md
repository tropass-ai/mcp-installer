# Install

Пользователь может установить Tropass MCP config одной командой:

```bash
npx -y @tropass/mcp-proxy install
```

CLI спросит:

- MCP client;
- Tropass MCP URL;
- Tropass API token.

Затем CLI сохранит MCP server config в конфигурационный файл выбранного клиента.

## Быстрые команды

Cursor project config:

```bash
npx -y @tropass/mcp-proxy install cursor
```

VS Code workspace config:

```bash
npx -y @tropass/mcp-proxy install vscode
```

Claude Desktop global config:

```bash
npx -y @tropass/mcp-proxy install claude-desktop
```

Generic `mcp.json` в текущей директории:

```bash
npx -y @tropass/mcp-proxy install generic
```

## Non-interactive install

```bash
npx -y @tropass/mcp-proxy install cursor \
  --url "https://api.tropass.me/mcp" \
  --token "your-api-token" \
  --yes
```

## Куда пишется конфиг

По умолчанию:

- Cursor: `.cursor/mcp.json` в текущем проекте;
- VS Code: `.vscode/mcp.json` в текущем workspace;
- Claude Desktop:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`;
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`;
  - Linux: `~/.config/Claude/claude_desktop_config.json`;
- generic: `mcp.json` в текущей директории.

Можно указать путь явно:

```bash
npx -y @tropass/mcp-proxy install generic --config ./my-mcp.json
```

