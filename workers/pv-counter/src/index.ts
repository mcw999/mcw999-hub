interface Env {
  PV: KVNamespace;
}

const ALLOWED_ORIGIN = "https://mcw999.github.io";
const DEDUP_TTL = 3600; // 同一訪問者の重複排除: 1時間

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function hashIP(ip: string, path: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}:${path}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // POST /api/pv — PVカウント
    if (request.method === "POST" && url.pathname === "/api/pv") {
      try {
        const body = await request.json<{ path?: string }>();
        const path = body.path;
        if (!path || typeof path !== "string") {
          return new Response("Bad request", { status: 400, headers: corsHeaders(origin) });
        }

        // 重複排除: 同一IP + path を1時間ブロック
        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const dedupKey = `dedup:${await hashIP(ip, path)}`;
        const existing = await env.PV.get(dedupKey);
        if (existing) {
          return new Response("Already counted", { status: 200, headers: corsHeaders(origin) });
        }
        await env.PV.put(dedupKey, "1", { expirationTtl: DEDUP_TTL });

        // カウンターインクリメント
        const pvKey = `pv:${path}`;
        const current = parseInt((await env.PV.get(pvKey)) || "0", 10);
        await env.PV.put(pvKey, String(current + 1));

        return new Response("OK", { status: 200, headers: corsHeaders(origin) });
      } catch {
        return new Response("Bad request", { status: 400, headers: corsHeaders(origin) });
      }
    }

    // GET /api/stats — 全ページのPVを返す
    if (request.method === "GET" && url.pathname === "/api/stats") {
      const pages: Record<string, number> = {};
      let cursor: string | undefined;

      do {
        const list = await env.PV.list({ prefix: "pv:", cursor });
        for (const key of list.keys) {
          const count = parseInt((await env.PV.get(key.name)) || "0", 10);
          const path = key.name.replace("pv:", "");
          pages[path] = count;
        }
        cursor = list.list_complete ? undefined : list.cursor;
      } while (cursor);

      return new Response(JSON.stringify({ pages }), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
