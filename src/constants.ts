import type {InstallClient} from "./types.js";

export const DEFAULT_MCP_URL = "https://апи.тропасс.рф";
export const TROPASS_URL = "https://тропасс.рф/";
export const LLM_GATEWAY_URL = "https://апи.ллм.тропасс.рф";
export const DEFAULT_LLM_MODEL = "Qwen3.5-397B-A17B-FP8";
export const LLM_MODELS = [DEFAULT_LLM_MODEL, "GLM-5.2"] as const;
export const DEFAULT_TOKEN_HEADER = "Authorization";
export const SUPPORTED_INSTALL_CLIENTS = new Set<InstallClient>(["opencode"]);
