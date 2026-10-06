# 📊 Dashboard Comptable PME — SuiteExpert

Dashboard comptable moderne pour les clients PME, connecté à l'API REST SuiteExpert.
Déployable sur **Cloudflare Pages** (gratuit) avec authentification et gestion des droits d'accès.

## ✨ Fonctionnalités

- 🔐 **Écran de connexion** (email + mot de passe), jetons signés (HMAC-SHA256, expiration 12 h)
- 👥 **Gestion ADMIN des utilisateurs** : création, rôles (admin / utilisateur), activation/désactivation, réinitialisation de mot de passe, suppression
- 🗂️ **Droits d'accès par dossier** : chaque utilisateur ne voit que les dossiers autorisés (vide = tous)
- 📊 **Dashboard** : chiffre d'affaires et résultat, TVA, trésorerie, créances clients et dettes fournisseurs détaillées, encours d'emprunts, répartition des charges et des ventes, top 3 des dépenses
- 🛡️ **Clé API SuiteExpert côté serveur** (Pages Functions) — jamais exposée au navigateur, **aucun problème CORS**

## 🏗️ Architecture

```
Navigateur (React + Tailwind, design sombre fintech)
   │  fetch /api/v1/... (même origine)
   ▼
Cloudflare Pages Functions
   ├── /functions/auth/*   → connexion, profil, gestion des utilisateurs (KV + PBKDF2 + JWT)
   └── /functions/api/*    → proxy vers l'API SuiteExpert (ajoute X-API-KEY)
   ▼
API REST SuiteExpert (https://isuite.bizgestion.fr/cnx/api)
```

Endpoints SuiteExpert utilisés : `POST /v1/sessions/dossier`, `GET /v1/dossiers`,
`POST /v1/compta/balance/clients | fournisseurs | generaux`.

## 🚀 Déploiement Cloudflare Pages

### 1. Préparer le repo

```bash
git init && git add . && git commit -m "Initial"
git remote add origin https://github.com/VOTRE-COMPTE/suiteexpert-dashboard.git
git push -u origin main
```

### 2. Créer le KV des utilisateurs

```bash
npx wrangler kv namespace create USERS
```

Copier l'identifiant `id` affiché dans `wrangler.toml` (à la place de `REMPLACER_PAR_VOTRE_KV_ID`), puis commit + push.

### 3. Créer le projet Pages

Dans le dashboard Cloudflare : **Workers & Pages → Create → Pages → Connect to Git**, puis :

- Framework preset : **Vite**
- Build command : `npm run build`
- Build output directory : `dist`
- Racine : `/`

### 4. Configurer les variables d'environnement

Dans **Settings → Variables and Secrets** du projet Pages :

| Variable | Valeur | Type |
|---|---|---|
| `AUTH_SECRET` | chaîne aléatoire longue (ex. `openssl rand -hex 32`) | Secret |
| `SUITE_BASE_URL` | `https://isuite.bizgestion.fr/cnx/api` | Secret |
| `SUITE_API_KEY` | votre clé API SuiteExpert | Secret |
| `ADMIN_EMAIL` | email du compte admin initial | Secret |
| `ADMIN_PASSWORD` | mot de passe admin initial (8 car. min) | Secret |

À la **première connexion**, l'admin est créé automatiquement dans le KV.

### 5. Utiliser

- URL du site : `https://votre-projet.pages.dev`
- Connexion avec `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- Bouton **⚙️ Admin** → créer les comptes des collaborateurs avec leurs dossiers autorisés
- Chaque utilisateur arrive sur le dashboard, choisit son dossier et voit ses chiffres

## 🧑‍💻 Développement local

```bash
npm install
cp .dev.vars.example .dev.vars   # puis remplir les valeurs
npm run build
npx wrangler pages dev dist      # sert le site + les functions en local
```

Le fichier `.dev.vars` est ignoré par git (ne jamais le committer).

## 🔒 Sécurité

- Mots de passe stockés **hachés** (PBKDF2, 100 000 itérations) dans le KV — jamais en clair
- Jetons signés HMAC-SHA256, expiration 12 h, vérifiés sur chaque requête
- La clé API SuiteExpert ne quitte jamais le serveur
- Un utilisateur non-admin ne peut jamais appeler `/auth/users` ni accéder à la page Admin
- Droits d'accès : `allowedDossiers` vide = tous les dossiers ; sinon filtrage strict côté interface

## 📁 Structure

```
├── functions/
│   ├── _lib/auth.js          # JWT, PBKDF2, helpers
│   ├── auth/login.js        # POST /auth/login
│   ├── auth/me.js           # GET  /auth/me
│   ├── auth/users.js        # CRUD /auth/users (admin)
│   └── api/[[path]].js      # Proxy /api/* → SuiteExpert
├── src/
│   ├── pages/Login.jsx      # Connexion email/mot de passe
│   ├── pages/Dashboard.jsx  # Dashboard comptable (KPI, graphiques)
│   ├── pages/Admin.jsx      # Gestion des utilisateurs et droits
│   ├── auth.jsx             # Contexte d'authentification
│   ├── api.js               # Client fetch (jeton + gestion 401)
│   └── App.jsx              # Routes + garde d'accès
├── wrangler.toml            # Binding KV USERS
└── .dev.vars.example        # Variables d'environnement locales
```
