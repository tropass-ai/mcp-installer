# Tools

Tropass model gateway публикует доступные пользователю ML-модели как MCP tools.

## Tool names

Техническое имя tool генерируется gateway и содержит slug модели и префикс UUID:

```text
model_<model_slug>_<model_id_prefix>
```

Агент не должен сохранять или угадывать это имя между сессиями. Для выбора модели надо использовать:

- `title`;
- `description`;
- `inputSchema`;
- текущий результат `tools/list`.

## List changes

Список tools зависит от пользователя и его доступов к моделям. Gateway возвращает capability:

```json
{
  "tools": {
    "listChanged": true
  }
}
```

Агент должен делать `tools/list`, когда:

- это первое обращение к Tropass MCP в текущей сессии;
- `initialize.result.capabilities.tools.listChanged` равно `true`;
- пользователь сменил token или environment;
- нужная модель не найдена;
- tool call вернул ошибку unknown tool.

Не нужно делать `tools/list` перед каждым вызовом модели.

## Input schema

Каждый tool содержит JSON Schema. Важные правила:

- отправлять только свойства из `inputSchema.properties`;
- заполнять все `required` поля;
- не добавлять extra fields, потому что `additionalProperties` равно `false`;
- соблюдать `enum`, `minimum`, `maximum`;
- для JSON input передавать object.

## File inputs

Файловые поля имеют тип:

```json
{
  "type": "array",
  "items": {
    "type": "string",
    "format": "uri"
  }
}
```

Передавать нужно массив существующих Tropass/S3 file URLs. MCP tool call не загружает локальные файлы и не принимает произвольные внешние URL.

## Output

Основной результат находится в `structuredContent`. Текстовый `content` содержит сериализованный fallback.

Если ответ содержит `isError: true`, агент должен показать ошибку пользователю и не делать бесконечные retries.

