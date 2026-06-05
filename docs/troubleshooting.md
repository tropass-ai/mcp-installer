# Troubleshooting

## No tools returned

Проверьте:

- `TROPASS_API_TOKEN` корректный и не удален;
- пользователь имеет доступ хотя бы к одной модели;
- `TROPASS_MCP_URL` указывает на `/mcp`;
- gateway доступен из вашей сети.

## 403 or invalid token

Gateway не получил валидный `X-API-TOKEN`. Если используется proxy, проверьте env:

```bash
echo "$TROPASS_MCP_URL"
test -n "$TROPASS_API_TOKEN"
```

Не печатайте сам token в логах.

## File URL rejected

MCP file inputs принимают массивы existing Tropass/S3 URLs. Local paths и arbitrary external URLs не подходят.

## Rate limit exceeded

Агент не должен делать retry loop. Подождите до сброса лимита или уменьшите частоту вызовов.

## Unknown tool

Сделайте повторный `initialize`, проверьте `listChanged`, затем `tools/list`. Tool names зависят от текущего списка моделей.

