import { json, requireAuth } from "../../_lib/auth.js";

export async function onRequest(context) {
  const { request, env, params } = context;
  const { user, error } = await requireAuth(request, env);
  if (error) return error;

  const base = String(env.SUITE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return json({ error: "SUITE_BASE_URL non configuré côté serveur" }, 500);

  const subPath = (params.path || []).join("/");
  const incoming = new URL(request.url);
  const target = `${base}/${subPath}${incoming.search}`;

  const headers = {
    "Content-Type": "application/json",
    "X-API-KEY": env.SUITE_API_KEY || "",
  };
  if (env.SUITE_CLIENT_IP) headers["X-CLIENT-IP"] = env.SUITE_CLIENT_IP;

  const init = { method: request.method, headers };
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.text();
  }

  try {
    const res = await fetch(target, init);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (e) {
    return json({ error: "Serveur SuiteExpert injoignable : " + e.message }, 502);
  }
}
