---
name: tropass-gateway
description: Use when calling Tropass ML models through the Tropass MCP server, selecting models, preparing model inputs, handling file URL arguments, or interpreting AgentResponse results.
---

# Tropass Gateway MCP

Use the configured Tropass MCP server for ML model calls.

## Tool discovery

- Call `tools/list` only on first Tropass use in the session, when `initialize.result.capabilities.tools.listChanged` is `true`, after token/environment changes, or after an unknown tool error.
- Do not call `tools/list` before every model call.
- Do not rely on memorized tool names. Tool names are generated as `model_<slug>_<model_id_prefix>`.

## Tool selection

- Match models by `title`, `description`, and `inputSchema`.
- If several models match equally, ask the user which model to use.
- If the requested model is missing, refresh tools once before concluding it is unavailable.

## Arguments

- Validate arguments against `inputSchema`.
- Send only schema properties. Extra fields are rejected.
- Required fields must be present.
- Use exact enum values when `enum` exists.
- Respect `minimum` and `maximum`.

## Files

- File-like inputs must be arrays of existing Tropass/S3 file URLs.
- Do not pass local paths.
- Do not pass arbitrary external URLs.
- The MCP tool call does not upload files.

## Result handling

- Prefer `structuredContent` as the source of truth.
- Treat text content as serialized fallback JSON.
- If `isError` is true, surface the error directly and do not retry blindly.
- On rate limit errors, do not loop retries unless the user explicitly asks.

