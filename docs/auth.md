# Auth

Tropass MCP использует пользовательский API token.

Канонический header:

```http
Authorization: Bearer <token>
```

Installer пишет direct remote MCP config и передает токен через header `Authorization`.

## Environment variables

```text
TROPASS_MCP_URL=https://апи.тропасс.рф/mcp
TROPASS_API_TOKEN=<your-api-token>
```

Если передать `TROPASS_API_TOKEN` уже с префиксом `Bearer `, installer не добавит префикс повторно.
