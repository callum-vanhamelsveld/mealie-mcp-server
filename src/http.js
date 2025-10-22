import axios from "axios";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { getConfig } from "./config.js";

const cfg = getConfig();

/**
 * Optional corporate CA trust (TLS interception support).
 * Activates ONLY if:
 *  - MCP_EXTRA_CA env var points to a readable PEM file, OR
 *  - a local ./corp-root.pem file exists next to package.json
 */
let httpsAgent; // undefined by default

try {
  const extraCaPathEnv = process.env.MCP_EXTRA_CA;
  const localPemPath = path.resolve("./corp-root.pem");

  let caPem = null;

  if (extraCaPathEnv && fs.existsSync(extraCaPathEnv)) {
    caPem = fs.readFileSync(extraCaPathEnv, "utf8");
  } else if (fs.existsSync(localPemPath)) {
    caPem = fs.readFileSync(localPemPath, "utf8");
  }

  if (caPem) {
    httpsAgent = new https.Agent({
      ca: caPem,
      rejectUnauthorized: true
    });
  }
} catch {
  // Ignore optional CA load errors; default trust will be used.
}

// Create Axios client (inject httpsAgent only if present)
export const http = axios.create({
  baseURL: cfg.baseUrl,
  timeout: cfg.timeoutMs,
  ...(httpsAgent ? { httpsAgent } : {}),
  headers: {
    Authorization: `Bearer ${cfg.token}`,
    "Content-Type": "application/json"
  }
});

// DEBUG: print whether extra CA is active and what base URL we use
try {
  // stderr so supervisors/clients don't parse it as protocol output
  if (process.env.DEBUG_MCP_MEALIE === "1") {
      console.error(JSON.stringify({
      type: "debug",
      at: "http-startup",
      baseURL: cfg.baseUrl,
      hasToken: !!cfg.token,
      timeoutMs: cfg.timeoutMs,
      extraCA: !!httpsAgent
    })
  );
}
} catch { /* no-op */ }

// Normalize errors for tool responses
export function normalizeError(err) {
  if (err.response) {
    const status = err.response.status;
    const data = err.response.data;
    return `HTTP ${status}: ${JSON.stringify(data)}`;
  }
  if (err.code) {
    return `Network/TLS error ${err.code}: ${err.message}`;
  }
  if (err.request) {
    return "Network/timeout error contacting Mealie API";
  }
  return err.message || String(err);
}
