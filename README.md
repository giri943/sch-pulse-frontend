# Schbang Pulse — Frontend

The Schbang Pulse dashboard — Next.js 15 (App Router), React 19, TypeScript, Tailwind,
TanStack Query and Recharts.

Talks to the [backend API](https://github.com/giri943/sch-pulse-backend).

## Run locally

**Prerequisites:** Node ≥ 20, and the backend API running (default `http://localhost:4000`).

```bash
# create .env.local (see below)
npm install
npm run dev      # dashboard on http://localhost:3000
```

Sign in with the seeded admin: `admin@schbang.com` / `ChangeMe123!`.

## Environment (`.env.local`)

| Variable | Required | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | `http://localhost:4000/api/v1` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | | Google OAuth client ID (for Google sign-in) |

## Deploy (Vercel)

- Set `NEXT_PUBLIC_API_URL` to your backend URL + `/api/v1`, and
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` if using Google sign-in.
- Set the **Production branch** to `master` so deploys track the right branch.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | Lint |
