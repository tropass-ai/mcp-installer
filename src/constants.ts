import type {InstallClient} from "./types.js";

export const DEFAULT_MCP_URL = "https://апи.тропасс.рф/mcp";
export const TROPASS_URL = "https://тропасс.рф/";
export const LLM_GATEWAY_URL = "https://апи.ллм.тропасс.рф/v1";
export const DEFAULT_TOKEN_HEADER = "Authorization";
export const MCP_MODEL_CALL_VERSION_HEADER = "Tropass-Model-Call-Version";
export const ASYNC_MODEL_CALL_VERSION = "2";
export const SYNC_MODEL_CALL_VERSION = "1";
export const SUPPORTED_INSTALL_CLIENTS = new Set<InstallClient>(["opencode"]);
