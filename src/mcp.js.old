import readline from "node:readline";

// Minimal MCP-like stdio loop:
// - Expects JSON messages per line from stdin
// - Dispatches to handlers and writes JSON responses per line to stdout

export function createStdioServer({ tools, onShutdown }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  function write(msg) {
    process.stdout.write(JSON.stringify(msg) + "\n");
  }

  // Advertise capabilities on handshake
  function handleHandshake() {
    const advertisedTools = Object.values(tools).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      outputSchema: t.outputSchema
    }));
    write({ type: "handshake/ok", tools: advertisedTools });
  }

  // Execute tools on request
  async function handleCallTool(payload) {
    const { name, args } = payload || {};
    if (!name || !tools[name]) {
      write({ type: "error", error: `Unknown tool '${name}'` });
      return;
    }
    try {
      const result = await tools[name].handler(args || {});
      write({ type: "tool/result", name, result });
    } catch (err) {
      write({
        type: "tool/error",
        name,
        error: (err && err.message) || String(err)
      });
    }
  }

  function handleShutdown() {
    write({ type: "shutdown/ok" });
    rl.close();
    if (onShutdown) onShutdown();
    process.exit(0);
  }

  rl.on("line", async (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      write({ type: "error", error: "Invalid JSON message" });
      return;
    }

    switch (msg.type) {
      case "handshake":
        handleHandshake();
        break;
      case "callTool":
        await handleCallTool(msg.payload);
        break;
      case "shutdown":
        handleShutdown();
        break;
      default:
        write({ type: "error", error: `Unknown message type '${msg.type}'` });
    }
  });

  // Startup banner (optional)
  function write(msg) {
    process.stdout.write(JSON.stringify(msg) + "\n");
  }

  // Emit plain text boot line (some supervisors watch for any output early)
  process.stdout.write("MCP server booting\n");

  // Emit a ready JSON line immediately (hypervisors can latch on this)
  write({ type: "ready", pid: process.pid });

  // Existing informational line (kept for compatibility)
  write({ type: "server/ready", message: "Mealie MCP stdio server ready" });
}
