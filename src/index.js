#!/usr/bin/env node

import { createStdioServer } from "./mcp.js";
import { tools } from "./tools.js";

function main() {
  createStdioServer({
    tools,
    onShutdown: () => {}
  });
}

try {
  main();
} catch (err) {
  // Emit a JSON-RPC style error so supervisors can read it
  process.stdout.write(JSON.stringify({
    jsonrpc: "2.0",
    error: { code: -32000, message: err.message || String(err) }
  }) + "\n");
  process.exit(1);
}
