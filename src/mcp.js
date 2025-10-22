import readline from "node:readline";

// JSON-RPC 2.0 over stdio with MCP-compatible methods.
// Methods:
// - initialize -> { protocolVersion, capabilities, serverInfo }
// - tools/list -> { tools: [{ name, description, inputSchema (raw JSON Schema) }] }
// - tools/call -> executes a tool with { name, args } and returns result
// - ping       -> { } (empty object)
// - shutdown   -> { ok: true }
//
// IMPORTANT: Stdout must be JSON-only for AnythingLLM. No plain text lines.

export function createStdioServer({ tools, onShutdown }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  const write = (obj) => {
    process.stdout.write(JSON.stringify(obj) + "\n");
  };

  // Emit a JSON event so supervisors detect startup
  write({ jsonrpc: "2.0", method: "event", params: { type: "initialized", pid: process.pid } });

  const formatTools = () => {
    return Object.values(tools).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema || { type: "object", properties: {} }
    }));
  };

  const callTool = async ({ name, args }) => {
    if (!name || !tools[name]) {
      const err = new Error(`Unknown tool '${name}'`);
      err.code = -32601;
      throw err;
    }
    return await tools[name].handler(args || {});
  };

  const handleRequest = async (msg) => {
    const { id, method, params } = msg || {};

    // Validate minimal JSON-RPC request shape
    if (!method || (typeof method !== "string")) {
      write({ jsonrpc: "2.0", id: id ?? null, error: { code: -32600, message: "Invalid Request: missing method" } });
      return;
    }

    try {
      switch (method) {
        case "initialize": {
          const result = {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "mealie-mcp-server", version: "0.1.0" }
          };
          write({ jsonrpc: "2.0", id, result });
          break;
        }

        case "tools/list": {
          const result = { tools: formatTools() };
          write({ jsonrpc: "2.0", id, result });
          break;
        }

        case "tools/call": {
          const result = await callTool(params || {});
          write({ jsonrpc: "2.0", id, result });
          break;
        }

        case "ping": {
          write({ jsonrpc: "2.0", id, result: {} });
          break;
        }

        case "shutdown": {
          write({ jsonrpc: "2.0", id, result: { ok: true } });
          rl.close();
          if (onShutdown) onShutdown();
          process.exit(0);
          break;
        }

        default: {
          write({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method '${method}'` } });
        }
      }
    } catch (e) {
      // Always return a JSON-RPC error object with numeric code
      const code = typeof e.code === "number" ? e.code : -32000;
      const message = e.message || String(e);
      write({ jsonrpc: "2.0", id, error: { code, message } });
    }
  };

  rl.on("line", async (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      // Return a proper JSON-RPC parse error
      write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
      return;
    }

    if (msg && msg.jsonrpc === "2.0" && (msg.method || msg.id !== undefined)) {
      await handleRequest(msg);
    } else {
      write({ jsonrpc: "2.0", id: msg?.id ?? null, error: { code: -32600, message: "Invalid Request" } });
    }
  });
}
