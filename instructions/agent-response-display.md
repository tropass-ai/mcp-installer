# Agent Response Display

Interpret Tropass MCP/ML agent responses as ordered UI panels. Use `structuredContent` as the source of truth; use text content only as serialized fallback JSON.

## Response model

Treat `AgentResponse.panel_items` as the display surface. Each `AgentPanelOutput` is one panel:

- `ml_model_task_id`: task/group identifier for logs, tracing, and deduplication.
- `panel_output_name`: user-facing panel title.
- `panel_type`: rendering hint, not a closed enum. Always keep a generic fallback.
- `primary_data`: optional structured visual data.
- `descriptions`: ordered text blocks.
- `attachments`: downloadable/supporting files.
- `panel_show_order`: optional preferred order.
- `is_last_panel`: stream/completion marker, not a visual panel type.

## Panel ordering

Render panels in stable order:

1. Panels with `panel_show_order` come first, sorted ascending.
2. Panels with the same `panel_show_order` keep their original response order.
3. Panels without `panel_show_order` keep their original response order after ordered panels.
4. Do not use `is_last_panel` for visual sorting.

## Display mapping

Normalize panels into a frontend-friendly shape before rendering:

```ts
type DisplayPanel = {
  taskId: string;
  title: string;
  panelType: string;
  order: number | null;
  descriptions: DisplayDescription[];
  chart: DisplayChart | null;
  media: DisplayMedia[];
  attachments: DisplayMedia[];
  isLastPanel: boolean;
};
```

Prefer field-preserving transforms over lossy stringification. Keep unknown fields available in debug logs when useful.

## Descriptions

Render `descriptions` in response order. Use `description_type` as a formatting hint. If the type is unknown or unsupported, render `content` as plain text. Never drop description content only because its type is unfamiliar.

## Chart data

`primary_data.plot_data` describes chart-ready data:

- `x_axis_values`: category, datetime, numeric, or mixed x-axis labels.
- `series_data[*].legend_name`: legend label.
- `series_data[*].plot_values`: numeric y-values.
- `x_axis_split_value`: optional grouping, split, or annotation value.

Render a chart only when at least one series has at least one numeric value. Validate every series against `x_axis_values`:

- If lengths match, render normally.
- If lengths differ, truncate that series to the shorter length for display and log a non-blocking diagnostic.
- If `x_axis_values` is empty but a series has values, generate positional labels only as a fallback.
- If no valid series remains, skip the chart and render other panel content.

Do not assume `x_axis_split_value` is a date. Use it only when the chart component supports a separator, marker, or grouping label.

## Media and attachments

`primary_data.media` is inline panel media. `attachments` are supporting files or downloads.

For browser UI:

- Prefer `s3_url` for display, preview, and download links.
- Use `file_name` as visible label or download filename.
- Use `mime_type` to choose image, video, audio, document, or generic file rendering.
- Treat `local_abs_path` as backend/internal metadata. Do not expose it as a browser URL.

If `s3_url` is missing or empty, show a disabled item or omit the preview and log diagnostics according to local product conventions.

## Fallback behavior

Never crash on partial or unfamiliar responses:

- Empty `panel_items`: show the product's empty result state.
- Missing `primary_data`: render descriptions and attachments.
- Descriptions only: render a text panel.
- Chart only: render a chart panel.
- Media only: render a media gallery.
- Unknown `panel_type`: render a generic panel using all available content.
- Empty panel content: render the title only if useful, otherwise suppress the panel and log diagnostics.
- Multiple `is_last_panel=true`: treat the latest received panel as the stream completion signal and log diagnostics.

## Implementation checks

When writing display code or tests, cover:

- stable `panel_show_order` sorting;
- unknown `panel_type` fallback;
- missing `primary_data`;
- chart x/y length mismatch;
- empty chart series;
- media and attachments using `s3_url`, not `local_abs_path`;
- unknown `description_type`;
- streamed responses where final completion is marked by `is_last_panel`.
