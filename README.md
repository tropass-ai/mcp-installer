# @tropass/mcp-installer

Инсталлер подключает AI-агента к Tropass: MCP tools с доступными ML-моделями и LLM provider `tropass`.

[Tropass](https://тропасс.рф/)

## Что Получится После Установки

После установки OpenCode сможет:

- видеть доступные вам Tropass ML-модели как MCP tools;
- вызывать модели с JSON Schema валидацией параметров;
- передавать file-like аргументы через существующие Tropass/S3 URL;
- получать структурированные ответы моделей;
- использовать LLM gateway Tropass как provider `tropass`.

Default model:

```text
Qwen3.5-397B-A17B-FP8
```

## Установка

Запустите интерактивный инсталлер:

```bash
npx -y @tropass/mcp-installer
```

CLI спросит:

- куда установить конфиг: в проект или глобально;
- URL MCP gateway;
- URL LLM gateway;
- Tropass API token.

## Быстрые Команды

```bash
npx -y @tropass/mcp-installer opencode
```

## Без Интерактивных Вопросов

```bash
npx -y @tropass/mcp-installer opencode \
  --scope project \
  --url "https://апи.тропасс.рф/mcp" \
  --llm-url "https://апи.ллм.тропасс.рф" \
  --token "your-api-token" \
  --yes
```

Алиасы scope:

```bash
npx -y @tropass/mcp-installer opencode --global --token "your-api-token" --yes
npx -y @tropass/mcp-installer opencode --local --token "your-api-token" --yes
```
