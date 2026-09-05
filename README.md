# Railzo — AI-Powered RPF Operations Platform

A real full-stack app: **Node/Express API + SQLite database** on the backend, **React (Vite)** on the frontend,
talking only over REST with JWT authentication. This is the same design and workflows from the earlier prototype,
now backed by an actual server and database instead of browser storage.

## Why SQLite instead of MongoDB

You asked for MERN. The data layer here is **SQLite** (via `better-sqlite3`) instead of MongoDB, because this
project was built and tested inside a sandboxed environment with no access to a MongoDB server. SQLite is a real,
production-capable relational database — plenty of small and medium deployments run on it directly — and the
routes are written with a normal data-access pattern, so swapping to MongoDB (with Mongoose) or Postgres (with
Prisma) later is a contained change to `server/db/db.js` and the route files, not a rewrite of the app.

## What's real here

- **JWT authentication** — passwords hashed with bcrypt, sessions are real signed tokens, verified on every request.
- **Role-based access** — enforced server-side in `middleware/auth.js` (`requireRole`), not just hidden in the UI.
- **A real database** — every incident, case, patrol, duty entry, and lost & found item is a row in `trackline.db`,
  persisted across restarts.
- **An audit log** — every create/update/advance is recorded with who did it and when (`audit_log` table).
- **Sequential Case IDs** — `TRK-2026-00001` style, generated server-side from a persisted counter.

## What's not done yet (and would be next)

- No HTTPS/reverse proxy config (add Nginx or a platform's built-in TLS when you deploy).
- No automated tests.
- No rate limiting / brute-force protection on login.
- No CCTV, face recognition, or GPS tracking — flagged as future modules in the original spec, intentionally out of scope here.
- The "Print report" feature uses the browser's own print-to-PDF, not a server-generated PDF.

## Project structure

```
trackline-app/
  server/       Express API + SQLite database
  client/       React (Vite) frontend
```

## Running it locally

### 1. Backend

```bash
cd server
npm install
cp .env.example .env       # edit if you want to change the JWT secret or add an Anthropic API key
npm run seed                # creates a demo login: badge RPF-0001 / password demo1234, plus sample data
npm run dev                  # starts the API on http://localhost:4000
```

### 2. Frontend (in a second terminal)

```bash
cd client
npm install
npm run dev                  # starts on http://localhost:5173, proxies /api to localhost:4000
```

Open **http://localhost:5173**, sign in with `RPF-0001` / `demo1234`, and you're in.

### 3. Running it as one process (production-style)

```bash
cd client && npm run build   # builds into client/dist
cd ../server && npm start    # serves the built frontend AND the API from :4000
```

Then just open **http://localhost:4000**.

## Enabling the AI Assistant

The AI features (AI Daily Summary, AI Assistant chat) call the Anthropic API from the **server**, not the browser,
so your API key is never exposed to users. To turn them on:

1. Get a key from https://console.anthropic.com/
2. Put it in `server/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Restart the server.

Without a key, those two features return a clear "not configured" message instead of failing silently.

## Deploying it for real

- **Backend**: any Node host (Render, Railway, a VPS, etc.). Set `JWT_SECRET` and `ANTHROPIC_API_KEY` as environment
  variables there — never commit `.env`.
- **Database**: `trackline.db` is a single file. For anything beyond a single small deployment, move to Postgres —
  the query patterns in each route file are simple enough to port directly.
- **Frontend**: either serve the built `client/dist` from the same Express server (as shown above — simplest), or
  deploy it separately (Vercel/Netlify) and point it at the backend's public URL by setting `VITE_API_TARGET` in
  `client/vite.config.js` or an equivalent proxy/rewrite rule on your hosting platform.

## Default roles

`Admin`, `Inspector`, `Sub Inspector`, `Constable`, `Control Room Operator`, `Supervisor`. Admin and Supervisor can
do everything; other roles are restricted by `requireRole(...)` on sensitive routes — check `middleware/auth.js`
and adjust to match how your organization actually wants permissions split.
