# Auth

Tropass MCP использует пользовательский API token.

Канонический header:

```http
X-API-TOKEN: <token>
```

Installer пишет direct remote MCP config и передает токен через header `X-API-TOKEN`.

## Environment variables

```text
TROPASS_MCP_URL=https://api.tropass.me/mcp
TROPASS_API_TOKEN=<your-api-token>
```

`Authorization: Bearer` не требуется для текущей версии gateway.
