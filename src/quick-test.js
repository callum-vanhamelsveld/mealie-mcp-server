import axios from "axios";

const base = process.env.MEALIE_BASE_URL || "https://mealie.strata.giize.com";
const token = process.env.MEALIE_TOKEN || "MISSING";

const http = axios.create({
  baseURL: base,
  timeout: 8000,
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  }
});

async function run() {
  console.log("Base URL:", base);
  try {
    const r = await http.get("/api/recipes", { params: { limit: 1 } });
    console.log("OK:", r.status);
    console.log(r.data);
  } catch (e) {
    if (e.response) {
      console.error("HTTP error:", e.response.status, e.response.data);
    } else if (e.code) {
      console.error("Network/TLS error code:", e.code);
      console.error("Message:", e.message);
    } else {
      console.error("Other error:", e.message);
    }
  }
}

run();
