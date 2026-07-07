import type {InstallClient} from "./types.js";

export const DEFAULT_MCP_URL = "https://xn--80aqu.xn--80a1adciab.xn--p1ai/mcp";
export const TROPASS_URL = "https://xn--80a1adciab.xn--p1ai/";
export const DEFAULT_TOKEN_HEADER = "Authorization";
export const SUPPORTED_INSTALL_CLIENTS = new Set<InstallClient>([
  "codex",
  "cursor",
  "claude",
  "opencode",
]);
