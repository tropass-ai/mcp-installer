#!/usr/bin/env node

import { main } from "../src/cli.js";

main().catch((error) => {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[tropass-mcp-proxy] fatal error: ${detail}\n`);
  process.exit(1);
});
