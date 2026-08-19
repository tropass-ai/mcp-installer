# Tropass MCP Installer

Подключает [OpenCode](https://opencode.ai/) к [Tropass](https://тропасс.рф/): добавляет MCP-инструменты с ML-моделями, LLM-провайдер `tropass` и инструкции для агента.

## Требования

- Node.js 22 или новее;
- OpenCode 1.17.16 или новее;
- API-токен Tropass.

## Быстрый старт

Запустите команду в каталоге проекта:

```bash
npx -y @tropass/mcp-installer@latest
```

Установщик попросит выбрать область установки и ввести API-токен. По умолчанию конфигурация создаётся глобально для текущего пользователя. После установки перезапустите OpenCode.

## Что будет настроено

В `opencode.json` будут добавлены MCP-сервер и LLM-провайдер `tropass` с моделью `GLM-5.2`. Нативный TUI-плагин добавит команду `/usage` для проверки недельного остатка токенов без обращения к модели. Моделью по умолчанию станет `tropass/GLM-5.2`. Остальные разделы конфигурации сохранятся.

При проектной установке появятся файлы:

```text
opencode.json
.opencode/skills/tropass-gateway/SKILL.md
.opencode/skills/agent-response-display/SKILL.md
.opencode/tropass-usage.mjs
.opencode/tui.json
```

## Область установки

| Режим | Конфигурация | Skills |
| --- | --- | --- |
| `global` | `~/.config/opencode/opencode.jsonc` | `~/.config/opencode/skills` |
| `project` | `<project>/opencode.json` | `<project>/.opencode/skills` |

На всех платформах, включая Windows, глобальный путь — `~/.config/opencode` (то есть `%USERPROFILE%\.config\opencode`).

Режим можно выбрать интерактивно или флагом `--global` / `--local`:

```bash
npx -y @tropass/mcp-installer@latest opencode --global
npx -y @tropass/mcp-installer@latest opencode --local
```

## Установка без вопросов

Для CI и скриптов:

```bash
npx -y @tropass/mcp-installer@latest opencode \
  --scope global \
  --token "your-api-token" \
  --yes
```

Токен и адреса шлюзов можно передать через переменные окружения:

```bash
export TROPASS_API_TOKEN="your-api-token"
export TROPASS_MCP_URL="https://апи.тропасс.рф"
export TROPASS_LLM_URL="https://апи.ллм.тропасс.рф"
npx -y @tropass/mcp-installer@latest opencode --scope global --yes
```

## Параметры CLI

```text
Использование: tropass-mcp-install [options] [client]

Аргументы:
  client             MCP-клиент (сейчас поддерживается opencode)

Параметры:
  --config <path>    путь к файлу конфигурации
  --url <url>        базовый URL шлюза Tropass MCP
  --llm-url <url>    URL шлюза Tropass LLM
  --token <token>    API-токен Tropass
  --scope <scope>    область установки: global или project
  --global           глобальная установка
  --local            установка в текущий проект
  --project <dir>    каталог проекта
  -y, --yes           принять значения по умолчанию
  -h, --help          показать справку
```

## Безопасность

API-токен сохраняется в конфигурации OpenCode и файле TUI-плагина. Не добавляйте проектные `opencode.json` и `.opencode/tropass-usage.mjs` в публичный репозиторий.

## Разработка

```bash
npm ci
npm run check
```

`npm run check` запускает проверку типов, линтер, тесты и сборку.

## Лицензия

[MIT](LICENSE)
