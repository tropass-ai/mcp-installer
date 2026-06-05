# Auth

Tropass MCP использует пользовательский API token.

Канонический header:

```http
X-API-TOKEN: <token>
```

Remote MCP clients, которые умеют задавать custom headers, могут подключаться напрямую к Tropass model gateway.

Клиенты, которые не умеют задавать custom headers или remote Streamable HTTP transport, должны использовать локальный `stdio` proxy из `packages/mcp-proxy`. Proxy берет токен из `TROPASS_API_TOKEN` и сам добавляет `X-API-TOKEN` к HTTP-запросам.

## Environment variables

```text
TROPASS_MCP_URL=https://api.tropass.me/mcp
TROPASS_API_TOKEN=<your-api-token>
```

Дополнительно:

```text
TROPASS_API_TOKEN_HEADER=X-API-TOKEN
TROPASS_MCP_CLIENT_NAME=tropass-mcp-proxy
TROPASS_MCP_CLIENT_VERSION=0.1.0
TROPASS_MCP_TIMEOUT_MS=600000
```

`Authorization: Bearer` не требуется для текущей версии gateway.

