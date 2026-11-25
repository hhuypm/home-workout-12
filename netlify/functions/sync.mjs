import { getStore } from "@netlify/blobs";
import { handleSync } from "../lib/sync-core.mjs";

/* POST /api/sync    push this device's data, get the other devices' data back
   DELETE /api/sync  remove the whole group from the cloud
   The sync code travels in the x-sync-code header and is never stored. */
export default async (req) => {
  const store = getStore({ name: "workout-sync", consistency: "strong" });
  const bodyText = req.method === "POST" ? await req.text() : "";
  const r = await handleSync({ method: req.method, code: req.headers.get("x-sync-code"), bodyText }, store);
  return new Response(JSON.stringify(r.json), { status: r.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
};

export const config = {
  path: "/api/sync",
  method: ["POST", "DELETE"],
  rateLimit: { action: "rate_limit", aggregateBy: ["ip", "domain"], windowSize: 60, windowLimit: 120 }
};
