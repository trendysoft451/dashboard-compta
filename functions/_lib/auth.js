const enc = new TextEncoder();

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const b64urlDecode = (s) =>
  atob(s.replace(/-/g, "+").replace(/_/g, "/"));

export async function hmacSign(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(sig);
}

export async function createToken(payload, secret, ttlHours = 12) {
  const body = { ...payload, exp: Date.now() + ttlHours * 3600 * 1000 };
  const h = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const p = b64url(enc.encode(JSON.stringify(body)));
  const sig = await hmacSign(`${h}.${p}`, secret);
  return `${h}.${p}.${sig}`;
}

export async function readToken(token, secret) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expected = await hmacSign(`${h}.${p}`, secret);
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(b64urlDecode(p));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password, saltB64) {
  let salt;
  if (saltB64) {
    const raw = atob(saltB64);
    salt = Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  } else {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 },
    key, 256
  );
  const saltOut = btoa(String.fromCharCode(...salt));
  const hashOut = b64url(bits);
  return { salt: saltOut, hash: hashOut };
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function requireAuth(request, env, { adminOnly = false } = {}) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const payload = await readToken(token, env.AUTH_SECRET);
  if (!payload) return { error: json({ error: "Non authentifié" }, 401) };
  if (adminOnly && payload.role !== "admin") {
    return { error: json({ error: "Accès réservé aux administrateurs" }, 403) };
  }
  return { user: payload };
}
