import readline from "node:readline";

// JSON-RPC 2.0 over stdio with MCP-compatible methods.
// Methods:
// - initialize -> { protocolVersion, capabilities, serverInfo }
// - tools/list -> { tools: [{ name, description, inputSchema: { jsonSchema } }] }
// - tools/call -> executes a tool with { name, args }
// - ping       -> basic liveness check { ok: true }
// - shutdown   -> clean exit
//
// Emits an "initialized" event immediately so supervisors detect startup.

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

  function formatTools() {
   return Object.values(tools).map(t => ({
     name: t.name,
     description: t.description,
     // Return the schema directly with a top-level "type": "object"
     inputSchema: t.inputSchema || { type: "object", properties: {} }
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
          const result = {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {} // advertise tool capability
            },
            serverInfo: {
              name: "mealie-mcp-server",
              version: "0.1.0"
            }
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
        // Return an empty object to satisfy strict schema
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
          write({
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Unknown method '${method}'` }
          });
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
