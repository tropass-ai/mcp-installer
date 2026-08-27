#!/usr/bin/env node

import { main } from "../src/cli.js";

main().catch((error) => {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[tropass-connect] критическая ошибка: ${detail}\n`);
  process.exit(1);
});
