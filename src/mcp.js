import readline from "node:readline";

// Minimal JSON-RPC 2.0 over stdio for MCP-like behavior that many hypervisors expect.
// Methods supported:
// - initialize
// - tools/list
// - tools/call
// - shutdown
//
// Requests: {"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
// Responses: {"jsonrpc":"2.0","id":1,"result":{...}}
// Notifications (no id): {"jsonrpc":"2.0","method":"event","params":{...}}

export function createStdioServer({ tools, onShutdown }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  function write(obj) {
    process.stdout.write(JSON.stringify(obj) + "\n");
  }

  // Emit something immediately so supervisors consider us alive
  process.stdout.write("MCP server booting\n");
  write({ jsonrpc: "2.0", method: "event", params: { type: "initialized", pid: process.pid } });

  function listTools() {
    return Object.values(tools).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      outputSchema: t.outputSchema
    }));
  }

  async function callTool({ name, args }) {
    if (!name || !tools[name]) {
      const err = new Error(`Unknown tool '${name}'`);
      err.code = -32601;
      throw err;
    }
    return await tools[name].handler(args || {});
  }

  async function handleRequest(msg) {
    const { id, method, params } = msg;

    try {
      switch (method) {
        case "initialize": {
          const result = { protocol: "jsonrpc-2.0", tools: listTools() };
          write({ jsonrpc: "2.0", id, result });
          break;
        }
        case "tools/list": {
          const result = { tools: listTools() };
          write({ jsonrpc: "2.0", id, result });
          break;
        }
        case "tools/call": {
          const result = await callTool(params || {});
          write({ jsonrpc: "2.0", id, result });
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
      write({
        jsonrpc: "2.0",
        id,
        error: {
          code: e.code ?? -32000,
          message: e.message || String(e)
        }
      });
    }
  }

  rl.on("line", async (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      // Non-JSON line; ignore or emit parse error without id.
      write({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } });
      return;
    }

    if (msg && msg.jsonrpc === "2.0" && msg.method) {
      await handleRequest(msg);
    } else {
      write({ jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" } });
    }
  });
}