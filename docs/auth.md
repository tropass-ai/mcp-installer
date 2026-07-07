# Auth

Tropass MCP использует пользовательский API token.

Канонический header:

```http
Authorization: Bearer <token>
```

Installer пишет direct remote MCP config и передает токен через header `Authorization`.

## Environment variables

```text
TROPASS_MCP_URL=https://xn--80aqu.xn--80a1adciab.xn--p1ai/mcp
TROPASS_API_TOKEN=<your-api-token>
```

Если передать `TROPASS_API_TOKEN` уже с префиксом `Bearer `, installer не добавит префикс повторно.
