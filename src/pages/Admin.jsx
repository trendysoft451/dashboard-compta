import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { api } from "../api.js";

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur shadow-lg p-5 ${className}`}>
    {children}
  </div>
);
const field =
  "w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "user", allowedDossiers: "" });

  const load = useCallback(() => {
    api("/auth/users")
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg) => { setMessage(msg); setError(null); setTimeout(() => setMessage(null), 4000); };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await api("/auth/users", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          allowedDossiers: form.allowedDossiers.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      notify(`Utilisateur ${form.email} créé`);
      setForm({ email: "", name: "", password: "", role: "user", allowedDossiers: "" });
      load();
    } catch (err) {
      setError(err.message);
      setMessage(null);
    }
  };

  const updateUser = async (email, patch) => {
    try {
      await api("/auth/users", {
        method: "PUT",
        body: JSON.stringify({ email, ...patch }),
      });
      notify(`Utilisateur ${email} mis à jour`);
      load();
    } catch (err) {
      setError(err.message);
      setMessage(null);
    }
  };

  const deleteUser = async (email) => {
    if (!window.confirm(`Supprimer l'utilisateur ${email} ?`)) return;
    try {
      await api(`/auth/users?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      notify(`Utilisateur ${email} supprimé`);
      load();
    } catch (err) {
      setError(err.message);
      setMessage(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(60rem_40rem_at_80%_-10%,rgba(99,102,241,0.15),transparent)] text-slate-100 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-300 via-white to-cyan-300 bg-clip-text text-transparent">
            ⚙️ Administration des accès
          </h1>
          <p className="text-xs text-slate-400 mt-1">Connecté : {user && user.email} ({user && user.role})</p>
        </div>
        <Link to="/" className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm hover:bg-slate-800">
          ← Retour au dashboard
        </Link>
      </header>

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-800 bg-emerald-950/50 p-3 text-sm text-emerald-300">✅ {message}</div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-300">⚠️ {error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">Créer un utilisateur</h3>
          <form onSubmit={createUser} className="space-y-3">
            <input className={field} type="email" required placeholder="Email" autoComplete="off"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={field} placeholder="Nom affiché"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={field} type="password" required minLength={8} placeholder="Mot de passe (8 car. min)" autoComplete="new-password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select className={field} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">Utilisateur (dashboard)</option>
              <option value="admin">Administrateur (gestion des accès)</option>
            </select>
            <input className={field} placeholder="Dossiers autorisés (codes séparés par , vide = tous)"
              value={form.allowedDossiers} onChange={(e) => setForm({ ...form, allowedDossiers: e.target.value })} />
            <button type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold hover:brightness-110">
              Créer l'utilisateur
            </button>
          </form>
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            Droits d'accès : un utilisateur ne voit que les dossiers listés (vide = tous les dossiers).
            Le rôle admin peut gérer les comptes et accède à toutes les données.
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">
            Utilisateurs ({users.length})
          </h3>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.email} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      {u.name || u.email}
                      <span className="ml-2 text-xs text-slate-400">{u.email}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Dossiers : {u.allowedDossiers && u.allowedDossiers.length ? u.allowedDossiers.join(", ") : "tous"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-slate-200"
                      value={u.role}
                      onChange={(e) => updateUser(u.email, { role: e.target.value })}
                    >
                      <option value="user">Utilisateur</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => updateUser(u.email, { enabled: !u.enabled })}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold border
                        ${u.enabled
                          ? "border-emerald-700 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60"
                          : "border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800"}`}
                    >
                      {u.enabled ? "Actif" : "Désactivé"}
                    </button>
                    <button
                      onClick={() => {
                        const pw = window.prompt(`Nouveau mot de passe pour ${u.email} (8 car. min) :`);
                        if (pw) updateUser(u.email, { password: pw });
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs border border-indigo-700 bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60">
                      🔑
                    </button>
                    <button
                      onClick={() => deleteUser(u.email)}
                      className="rounded-lg px-3 py-1.5 text-xs border border-rose-800 bg-rose-950/60 text-rose-300 hover:bg-rose-900/60">
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-sm text-slate-500">Aucun utilisateur. Créez le premier compte admin via la connexion initiale (variables ADMIN_EMAIL / ADMIN_PASSWORD).</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
