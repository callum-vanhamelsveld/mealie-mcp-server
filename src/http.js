import axios from "axios";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { getConfig } from "./config.js";

const cfg = getConfig();

/**
 * Optional corporate CA trust (for environments with TLS interception like Cisco Umbrella)
 * - This block activates ONLY if:
 *   a) MCP_EXTRA_CA env var points to a readable PEM file, OR
 *   b) a local ./corp-root.pem file exists
 * - In all other cases, Axios/Node use the default trust store and this has no effect.
 * - Safe to keep in public code; it’s dormant unless explicitly enabled.
 */
let httpsAgent; // undefined by default (no change in behavior unless activated)

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
} catch (e) {
  // If anything goes wrong reading the CA, fall back to default trust without failing startup
  // console.warn("Optional MCP_EXTRA_CA load failed:", e?.message || e);
}

/**
 * Axios client for Mealie API
 * - If httpsAgent is defined (corporate CA loaded), it will be used.
 * - Otherwise, Axios uses the default agent and trust settings.
 */
export const http = axios.create({
  baseURL: cfg.baseUrl,
  timeout: cfg.timeoutMs,
  ...(httpsAgent ? { httpsAgent } : {}),
  headers: {
    Authorization: `Bearer ${cfg.token}`,
    "Content-Type": "application/json"
  }
});

// Normalize errors for tool responses
export function normalizeError(err) {
  if (err.response) {
    const status = err.response.status;
    const data = err.response.data;
    return `HTTP ${status}: ${JSON.stringify(data)}`;
  }
  if (err.code) {
    // Provide more specific TLS/network diagnostics if available
    return `Network/TLS error ${err.code}: ${err.message}`;
  }
  if (err.request) {
    return "Network/timeout error contacting Mealie API";
  }
  return err.message || String(err);
}
