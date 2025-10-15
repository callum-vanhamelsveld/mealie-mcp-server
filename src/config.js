export function getConfig() {
  const baseUrl = process.env.MEALIE_BASE_URL;
  const token = process.env.MEALIE_TOKEN;
  const timeoutMs = Number(process.env.MEALIE_TIMEOUT_MS || "8000");

  if (!baseUrl) {
    throw new Error("Missing MEALIE_BASE_URL environment variable");
  }
  if (!token) {
    throw new Error("Missing MEALIE_TOKEN environment variable");
  }

  return { baseUrl, token, timeoutMs };
}
