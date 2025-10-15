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
  // Temporary heartbeat to satisfy strict supervisors expecting early output
  let beats = 0;
  const hb = setInterval(() => {
  beats += 1;
  process.stdout.write(JSON.stringify({ type: "heartbeat", t: Date.now() }) + "\n");
  if (beats >= 5) clearInterval(hb);
  }, 1000);
}

try {
  main();
} catch (err) {
  console.error(JSON.stringify({ type: "fatal", error: err.message || String(err) }));
  process.exit(1);
}
