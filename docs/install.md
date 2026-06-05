# Install

Пользователь может установить Tropass MCP config и инструкции для агента одной командой:

```bash
npx -y @tropass/mcp-proxy install
```

CLI спросит:

- MCP client;
- Tropass MCP URL;
- Tropass API token.

Затем CLI сохранит:

- MCP server config в конфигурационный файл выбранного клиента;
- инструкции по работе с Tropass MCP в native instruction/rules файл выбранного клиента.

## Быстрые команды

Cursor project config:

```bash
npx -y @tropass/mcp-proxy install cursor
```

VS Code workspace config:

```bash
npx -y @tropass/mcp-proxy install vscode
```

Claude global config:

```bash
npx -y @tropass/mcp-proxy install claude
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

## Куда пишутся файлы

По умолчанию:

- Cursor:
  - config: `.cursor/mcp.json` в текущем проекте;
  - instructions: `.cursor/rules/tropass-mcp.mdc`;
- VS Code:
  - config: `.vscode/mcp.json` в текущем workspace;
  - instructions: `.github/copilot-instructions.md`;
- Claude:
  - config on macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`;
  - config on Windows: `%APPDATA%\Claude\claude_desktop_config.json`;
  - config on Linux: `~/.config/Claude/claude_desktop_config.json`;
  - instructions: `tropass-mcp-instructions.md` рядом с config;
- generic:
  - config: `mcp.json` в текущей директории;
  - instructions: `AGENTS.md` в текущей директории.

Для `AGENTS.md` и `.github/copilot-instructions.md` installer использует managed block и не стирает существующие инструкции.

Можно указать путь явно:

```bash
npx -y @tropass/mcp-proxy install generic --config ./my-mcp.json
```
