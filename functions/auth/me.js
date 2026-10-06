import { json, requireAuth } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const { user, error } = await requireAuth(request, env);
  if (error) return error;
  return json({
    email: user.email,
    role: user.role,
    name: user.name,
    allowedDossiers: user.allowedDossiers,
  });
}
