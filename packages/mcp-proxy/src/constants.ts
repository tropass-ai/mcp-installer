import type { InstallClient } from "./types.js";

export const DEFAULT_MCP_URL = "https://api.tropass.me/mcp";
export const DEFAULT_TOKEN_HEADER = "X-API-TOKEN";
export const DEFAULT_TIMEOUT_MS = 600_000;
export const SUPPORTED_INSTALL_CLIENTS = new Set<InstallClient>(["cursor", "vscode", "claude", "generic"]);
