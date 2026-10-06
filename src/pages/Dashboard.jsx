import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, AreaChart, Area,
} from "recharts";
import { useAuth } from "../auth.jsx";
import { seGet, sePost } from "../api.js";

const iso = (d) => d.toISOString().slice(0, 19);
const year = new Date().getFullYear();
const PERIOD = { start: new Date(year - 1, 0, 1), end: new Date(year, 11, 31) };

const DEMO = {
  demo: true, dossier: "DEMO — SARL Exemple",
  kpis: { ca: 486500, resultat: 68300, marge: 14.0, tva: 12650, treso: 94250, emprunts: 128000, creances: 112400, dettes: 78900 },
  clients: [
    { code: "C001", lib: "Dupont Travaux", solde: 24500 }, { code: "C002", lib: "Martin Distribution", solde: 18750 },
    { code: "C003", lib: "SCI Horizon", solde: 15200 }, { code: "C004", lib: "Bernard Logistics", solde: 12800 },
    { code: "C005", lib: "Alpha Services", solde: 9600 },
  ],
  fournisseurs: [
    { code: "F001", lib: "Grossiste Matériaux", solde: 21500 }, { code: "F002", lib: "EDF Énergie", solde: 14800 },
    { code: "F003", lib: "Loca Mat Pro", solde: 11200 }, { code: "F004", lib: "Assurances Prev", solde: 8600 },
  ],
  charges: [
    { name: "64 Charges de personnel", value: 142000 }, { name: "60 Achats", value: 96500 },
    { name: "62 Autres services ext.", value: 58400 }, { name: "61 Fournitures & services ext.", value: 41200 },
    { name: "63 Impôts & taxes", value: 23800 }, { name: "66 Charges financières", value: 12800 },
  ],
  ventes: [
    { name: "Ventes de services", value: 296000 }, { name: "Ventes de marchandises", value: 128000 },
    { name: "Prestations diverses", value: 42500 }, { name: "Produits exceptionnels", value: 20000 },
  ],
};

const eur = (v) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v || 0);
const PALETTE = ["#6366f1", "#22d3ee", "#f59e0b", "#f472b6", "#34d399", "#a78bfa", "#fb7185", "#facc15"];
const CHARGE_COLORS = ["#6366f1", "#f472b6", "#f59e0b", "#34d399", "#22d3ee", "#a78bfa", "#fb7185"];

function buildModel(balClients, balFourn, balGeneraux, dossier) {
  const num = (s) => parseFloat(String(s || "0").replace(",", ".")) || 0;
  const starts = (code, prefixes) => prefixes.some((p) => String(code || "").startsWith(p));

  const clients = (balClients || [])
    .map((c) => ({ code: c.Code, lib: c.Lib || c.Code, solde: num(c.Solde) }))
    .filter((c) => c.solde > 0.009)
    .sort((a, b) => b.solde - a.solde);
  const creances = clients.reduce((a, b) => a + b.solde, 0);

  const fournisseurs = (balFourn || [])
    .map((f) => ({ code: f.Code, lib: f.Lib || f.Code, solde: -num(f.Solde) }))
    .filter((f) => f.solde > 0.009)
    .sort((a, b) => b.solde - a.solde);
  const dettes = fournisseurs.reduce((a, b) => a + b.solde, 0);

  const absSum = (arr, pred) => arr.filter(pred).reduce((a, b) => a + Math.abs(num(b.Solde)), 0);
  const tva = absSum(balGeneraux, (g) => starts(g.Code, ["440", "441", "445", "431", "437"]));
  const treso = (balGeneraux || []).filter((g) => starts(g.Code, ["51", "53", "58"]))
    .reduce((a, b) => a + num(b.Solde), 0);
  const emprunts = absSum(balGeneraux, (g) => starts(g.Code, ["16", "255", "27"]));

  const familles = {
    "61 Fournitures & services ext.": ["61"], "62 Autres services ext.": ["62"],
    "63 Impôts & taxes": ["63"], "64 Charges de personnel": ["64"],
    "65 Autres charges de gestion": ["65"], "66 Charges financières": ["66"],
    "68 Dotations": ["68"], "60 Achats": ["60"],
  };
  const charges = Object.entries(familles)
    .map(([name, prefixes]) => ({ name, value: Math.round(absSum(balGeneraux, (g) => starts(g.Code, prefixes))) }))
    .filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
  const totalCharges = charges.reduce((a, b) => a + b.value, 0);
  const top3 = charges.slice(0, 3);

  const ventes = (balGeneraux || []).filter((g) => starts(g.Code, ["70", "71"]))
    .map((g) => ({ name: g.Lib || g.Code, value: Math.abs(num(g.Solde)) }))
    .filter((v) => v.value > 0).sort((a, b) => b.value - a.value);
  const ca = ventes.reduce((a, b) => a + b.value, 0);

  return {
    demo: false, dossier,
    kpis: {
      ca, creances, dettes, tva, treso, emprunts,
      resultat: ca - totalCharges,
      marge: ca > 0 ? Math.max(0, Math.round(((ca - totalCharges) / ca) * 1000) / 10) : 0,
    },
    clients: clients.slice(0, 12), fournisseurs: fournisseurs.slice(0, 12),
    charges, top3, totalCharges, ventes,
  };
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur shadow-lg shadow-indigo-950/30 p-5 ${className}`}>
      {children}
    </div>
  );
}
function Kpi({ label, value, sub, accent, icon }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl opacity-20 ${accent}`} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}
function Section({ title, children, right }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">{title}</h3>
        {right}
      </div>
      {children}
    </Card>
  );
}
function BalanceTable({ rows, label, totalLabel, total, colorClass }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.solde)), 1);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto] text-xs text-slate-400 pb-1 border-b border-slate-800">
        <span>{label}</span><span>Solde</span>
      </div>
      {rows.map((r) => (
        <div key={r.code} className="group">
          <div className="grid grid-cols-[1fr_auto] items-center text-sm py-1">
            <span className="truncate text-slate-200">
              <span className="text-[10px] font-mono text-slate-500 mr-2">{r.code}</span>{r.lib}
            </span>
            <span className={`tabular-nums font-semibold ${colorClass}`}>{eur(r.solde)}</span>
          </div>
          <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
              style={{ width: `${(Math.abs(r.solde) / max) * 100}%` }} />
          </div>
        </div>
      ))}
      <div className="grid grid-cols-[1fr_auto] pt-2 border-t border-slate-700 text-sm font-bold">
        <span className="text-slate-300">{totalLabel}</span>
        <span className={`tabular-nums ${colorClass}`}>{eur(total)}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [dossiers, setDossiers] = useState([]);
  const [codeDossier, setCodeDossier] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    seGet("/v1/dossiers")
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        const mapped = arr.map((d) => ({ code: d.Code || d.code, lib: d.Lib || d.Libelle || d.Nom || d.Code }))
          .filter((d) => d.code);
        const allowed = (user && user.allowedDossiers && user.allowedDossiers.length)
          ? mapped.filter((d) => user.allowedDossiers.includes(d.code))
          : mapped;
        setDossiers(allowed);
        if (allowed.length) setCodeDossier(allowed[0].code);
      })
      .catch(() => setDossiers([]));
  }, [user]);

  const refresh = useCallback(async () => {
    if (!codeDossier) return;
    setLoading(true);
    setError(null);
    try {
      await sePost("/v1/sessions/dossier", codeDossier);
      const filtre = {
        CptDebut: "0", CptFin: "ZZZZZZZZ",
        DateDebut: iso(PERIOD.start), DateFin: iso(PERIOD.end),
        RecupererANouveau: true,
      };
      const [bc, bf, bg] = await Promise.all([
        sePost("/v1/compta/balance/clients", filtre),
        sePost("/v1/compta/balance/fournisseurs", filtre),
        sePost("/v1/compta/balance/generaux", filtre),
      ]);
      setData(buildModel(bc, bf, bg, codeDossier));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [codeDossier]);

  useEffect(() => {
    if (codeDossier) refresh();
  }, [codeDossier, refresh]);

  const d = data;
  const k = d?.kpis || {};
  const pieData = useMemo(() => (d ? [
    { name: "Trésorerie", value: Math.max(0, k.treso) },
    { name: "Créances clients", value: k.creances },
    { name: "Dettes fournisseurs", value: k.dettes },
    { name: "Encours emprunts", value: k.emprunts },
    { name: "TVA", value: k.tva },
  ] : []), [d]);

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(60rem_40rem_at_80%_-10%,rgba(99,102,241,0.15),transparent),radial-gradient(50rem_30rem_at_-10%_110%,rgba(34,211,238,0.10),transparent)] text-slate-100 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-white to-cyan-300 bg-clip-text text-transparent">
            📊 Dashboard Comptable PME
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            SuiteExpert · {d ? d.dossier : "…"} · {user && `connecté : ${user.email}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={codeDossier}
            onChange={(e) => setCodeDossier(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
          >
            {dossiers.map((dos) => (
              <option key={dos.code} value={dos.code}>{dos.code} — {dos.lib}</option>
            ))}
          </select>
          <button onClick={refresh} disabled={loading || !codeDossier}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-40">
            {loading ? "Chargement…" : "🔄 Actualiser"}
          </button>
          {user && user.role === "admin" && (
            <Link to="/admin" className="rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-2 text-sm font-semibold hover:brightness-110">
              ⚙️ Admin
            </Link>
          )}
          <button onClick={logout} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm hover:bg-slate-800">
            Déconnexion
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-300">
          ⚠️ {error}
        </div>
      )}

      {!codeDossier && !error && (
        <div className="mb-4 rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-300">
          Aucun dossier accessible. Contactez votre administrateur (droits d'accès par dossier).
        </div>
      )}

      {loading && !d && (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/70 animate-pulse" />
          ))}
        </div>
      )}

      {d && (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Chiffre d'affaires" value={eur(k.ca)} sub={`Résultat : ${eur(k.resultat)} · Marge ${k.marge}%`} accent="bg-indigo-500" icon="🚀" />
            <Kpi label="Solde de trésorerie" value={eur(k.treso)} sub="Comptes 51/53/58" accent="bg-cyan-400" icon="🏦" />
            <Kpi label="Créances clients" value={eur(k.creances)} sub={`${d.clients.length} clients débiteurs`} accent="bg-emerald-400" icon="📥" />
            <Kpi label="Dettes fournisseurs" value={eur(k.dettes)} sub={`${d.fournisseurs.length} fournisseurs créditeurs`} accent="bg-rose-400" icon="📤" />
            <Kpi label="TVA (solde)" value={eur(k.tva)} sub="Comptes 44x" accent="bg-amber-400" icon="🧾" />
            <Kpi label="Encours emprunts" value={eur(k.emprunts)} sub="Comptes 16x/255" accent="bg-fuchsia-400" icon="🏛️" />
            <Kpi label="Total charges" value={eur(d.totalCharges)} sub="Classe 6 sur l'exercice" accent="bg-orange-400" icon="📉" />
            <Kpi label="Top 3 dépenses" value={eur(d.top3.reduce((a, b) => a + b.value, 0))}
              sub={`${Math.round((d.top3.reduce((a, b) => a + b.value, 0) / (d.totalCharges || 1)) * 100)}% des charges`} accent="bg-yellow-400" icon="🏆" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Section title="Structure financière" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={pieData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => v / 1000 + "k"} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }}
                    formatter={(v) => eur(v)} />
                  <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} fill="url(#g1)" name="Montant" />
                </AreaChart>
              </ResponsiveContainer>
            </Section>
            <Section title="🏆 Top 3 des dépenses">
              <div className="space-y-3">
                {d.top3.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <div className={`w-9 h-9 shrink-0 rounded-xl grid place-items-center text-sm
                      ${i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500"
                        : i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400"
                        : "bg-gradient-to-br from-orange-700 to-amber-800"}`}>
                      {["🥇", "🥈", "🥉"][i]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-200 truncate">{c.name}</p>
                      <div className="h-1.5 mt-1 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-rose-400"
                          style={{ width: `${(c.value / d.top3[0].value) * 100}%` }} />
                      </div>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-orange-300">{eur(c.value)}</p>
                  </div>
                ))}
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-800">
                  Les 3 premières familles de charges représentent{" "}
                  <span className="text-slate-300 font-semibold">
                    {Math.round((d.top3.reduce((a, b) => a + b.value, 0) / (d.totalCharges || 1)) * 100)}%
                  </span>{" "}
                  des charges totales.
                </p>
              </div>
            </Section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Répartition des charges (classe 6)">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={d.charges} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={3}>
                    {d.charges.map((_, i) => (
                      <Cell key={i} fill={CHARGE_COLORS[i % CHARGE_COLORS.length]} stroke="#0f172a" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }}
                    formatter={(v) => eur(v)} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                </PieChart>
              </ResponsiveContainer>
            </Section>
            <Section title="Répartition des ventes (classe 7)">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={d.ventes.slice(0, 6)} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => v / 1000 + "k"} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }}
                    formatter={(v) => eur(v)} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {d.ventes.slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="📥 Créances clients — détail par client"
              right={<span className="text-xs text-emerald-400 font-semibold">{eur(k.creances)}</span>}>
              <BalanceTable rows={d.clients} label="Client" totalLabel="Total créances"
                total={k.creances} colorClass="text-emerald-300" />
            </Section>
            <Section title="📤 Dettes fournisseurs — détail par fournisseur"
              right={<span className="text-xs text-rose-400 font-semibold">{eur(k.dettes)}</span>}>
              <BalanceTable rows={d.fournisseurs} label="Fournisseur" totalLabel="Total dettes"
                total={k.dettes} colorClass="text-rose-300" />
            </Section>
          </div>

          <footer className="text-center text-[11px] text-slate-600 pt-2">
            Période analysée : exercice en cours · Données SuiteExpert (API REST via Cloudflare Pages Functions)
          </footer>
        </div>
      )}
    </div>
  );
}
