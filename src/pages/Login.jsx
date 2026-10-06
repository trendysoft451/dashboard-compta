import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-lg bg-slate-950/70 border border-slate-700 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 bg-[radial-gradient(60rem_40rem_at_80%_-10%,rgba(99,102,241,0.18),transparent),radial-gradient(50rem_30rem_at_-10%_110%,rgba(34,211,238,0.10),transparent)] p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur p-8 space-y-5 shadow-2xl"
      >
        <div className="text-center">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-300 via-white to-cyan-300 bg-clip-text text-transparent">
            📊 Dashboard Comptable
          </h1>
          <p className="text-xs text-slate-400 mt-1">SuiteExpert — connexion sécurisée</p>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Adresse email</label>
          <input
            className={field}
            type="email"
            required
            autoComplete="email"
            placeholder="vous@cabinet.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Mot de passe</label>
          <input
            className={field}
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-rose-800 bg-rose-950/60 p-3 text-xs text-rose-300">
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40 transition"
        >
          {busy ? "Connexion…" : "Se connecter"}
        </button>

        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          Compte créé par l'administrateur (menu ⚙️ Admin).<br />
          Les identifiants SuiteExpert restent côté serveur.
        </p>
      </form>
    </div>
  );
}
