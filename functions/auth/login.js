import { createToken, hashPassword, json } from "../_lib/auth.js";

const USERS_KEY = "users";

async function loadUsers(env) {
  const raw = await env.USERS.get(USERS_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function saveUsers(env, users) {
  await env.USERS.put(USERS_KEY, JSON.stringify(users));
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Requête invalide" }, 400);
  }
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) {
    return json({ error: "Email et mot de passe requis" }, 400);
  }

  let users = await loadUsers(env);

  if (Object.keys(users).length === 0 && env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const adminEmail = env.ADMIN_EMAIL.trim().toLowerCase();
    const { salt, hash } = await hashPassword(env.ADMIN_PASSWORD);
    users[adminEmail] = {
      email: adminEmail,
      name: "Administrateur",
      salt,
      hash,
      role: "admin",
      allowedDossiers: [],
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    await saveUsers(env, users);
  }

  const user = users[email];
  if (!user || user.enabled === false) {
    return json({ error: "Identifiants incorrects ou compte désactivé" }, 401);
  }
  const { hash } = await hashPassword(password, user.salt);
  if (hash !== user.hash) {
    return json({ error: "Identifiants incorrects" }, 401);
  }

  const token = await createToken(
    { email: user.email, role: user.role, name: user.name, allowedDossiers: user.allowedDossiers },
    env.AUTH_SECRET
  );
  return json({
    token,
    user: {
      email: user.email,
      role: user.role,
      name: user.name,
      allowedDossiers: user.allowedDossiers,
    },
  });
}
