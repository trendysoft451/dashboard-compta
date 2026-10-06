import { hashPassword, json, requireAuth } from "../../_lib/auth.js";

const USERS_KEY = "users";

async function loadUsers(env) {
  const raw = await env.USERS.get(USERS_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function saveUsers(env, users) {
  await env.USERS.put(USERS_KEY, JSON.stringify(users));
}

const strip = (u) => ({
  email: u.email,
  name: u.name,
  role: u.role,
  allowedDossiers: u.allowedDossiers,
  enabled: u.enabled !== false,
  createdAt: u.createdAt,
});

export async function onRequestGet({ request, env }) {
  const { error } = await requireAuth(request, env, { adminOnly: true });
  if (error) return error;
  const users = await loadUsers(env);
  return json(Object.values(users).map(strip));
}

export async function onRequestPost({ request, env }) {
  const { error } = await requireAuth(request, env, { adminOnly: true });
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Requête invalide" }, 400);
  }
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = body.role === "admin" ? "admin" : "user";
  if (!email || !email.includes("@") || password.length < 8) {
    return json({ error: "Email valide et mot de passe de 8 caractères minimum requis" }, 400);
  }
  const users = await loadUsers(env);
  if (users[email]) return json({ error: "Cet utilisateur existe déjà" }, 409);
  const { salt, hash } = await hashPassword(password);
  users[email] = {
    email,
    name: String(body.name || "").slice(0, 80),
    salt,
    hash,
    role,
    allowedDossiers: Array.isArray(body.allowedDossiers)
      ? body.allowedDossiers.map((d) => String(d).trim()).filter(Boolean)
      : [],
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  await saveUsers(env, users);
  return json(strip(users[email]), 201);
}

export async function onRequestPut({ request, env }) {
  const { user: caller, error } = await requireAuth(request, env, { adminOnly: true });
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Requête invalide" }, 400);
  }
  const email = String(body.email || "").trim().toLowerCase();
  const users = await loadUsers(env);
  const target = users[email];
  if (!target) return json({ error: "Utilisateur introuvable" }, 404);
  if (email === caller.email && body.role && body.role !== "admin") {
    return json({ error: "Impossible de retirer votre propre rôle administrateur" }, 400);
  }
  if (body.name !== undefined) target.name = String(body.name).slice(0, 80);
  if (body.role !== undefined) target.role = body.role === "admin" ? "admin" : "user";
  if (body.allowedDossiers !== undefined) {
    target.allowedDossiers = Array.isArray(body.allowedDossiers)
      ? body.allowedDossiers.map((d) => String(d).trim()).filter(Boolean)
      : [];
  }
  if (body.enabled !== undefined && email !== caller.email) {
    target.enabled = !!body.enabled;
  }
  if (body.password) {
    if (String(body.password).length < 8) {
      return json({ error: "Mot de passe de 8 caractères minimum requis" }, 400);
    }
    const { salt, hash } = await hashPassword(String(body.password));
    target.salt = salt;
    target.hash = hash;
  }
  await saveUsers(env, users);
  return json(strip(target));
}

export async function onRequestDelete({ request, env }) {
  const { user: caller, error } = await requireAuth(request, env, { adminOnly: true });
  if (error) return error;
  const url = new URL(request.url);
  const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
  if (!email) return json({ error: "Paramètre email requis" }, 400);
  if (email === caller.email) return json({ error: "Impossible de supprimer votre propre compte" }, 400);
  const users = await loadUsers(env);
  if (!users[email]) return json({ error: "Utilisateur introuvable" }, 404);
  delete users[email];
  await saveUsers(env, users);
  return json({ ok: true });
}
