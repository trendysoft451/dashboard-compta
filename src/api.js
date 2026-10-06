const TOKEN_KEY = "se_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken() || ""}`,
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Session expirée");
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text.slice(0, 300) };
  }
  if (!res.ok) {
    throw new Error((data && (data.error || data.Message || data.message)) || `Erreur ${res.status}`);
  }
  return data;
}

export const seGet = (path) => api(`/api${path}`);
export const sePost = (path, body) =>
  api(`/api${path}`, { method: "POST", body: JSON.stringify(body) });
