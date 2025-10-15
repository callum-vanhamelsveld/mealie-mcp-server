#!/usr/bin/env node

import { createStdioServer } from "./mcp.js";
import { tools } from "./tools.js";

function main() {
  // Basic env checks happen in http/config imports inside tools
  createStdioServer({
    tools,
    onShutdown: () => {
      // optional cleanup
    }
  });
}

try {
  main();
} catch (err) {
  console.error(JSON.stringify({ type: "fatal", error: err.message || String(err) }));
  process.exit(1);
}
