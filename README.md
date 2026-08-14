# Helm

Your daily progress desk — for individuals and teams, controlled by you and your AI over MCP.

One Next.js app that's both:

1. An **MCP server** (`/api/mcp`) so Claude (or any MCP client) can log or query work mid-conversation, scoped to your workspace via a per-user API key.
2. A **dashboard** (`/`) to browse, organize, and manage entries by hand.

Multi-tenant: sign in with Google or GitHub, create a workspace, invite teammates (view-only for now — write roles are on the roadmap). Auth and organizations are powered by [better-auth](https://better-auth.com).

## Setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, BETTER_AUTH_SECRET, and OAuth creds
npm run db:migrate           # apply schema to your Neon database
npm run dev
```

- `DATABASE_URL` — Neon **pooled** connection string (the `-pooler` host).
- `BETTER_AUTH_SECRET` — any long random secret; generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
- `BETTER_AUTH_URL` — the app's own URL (e.g. `http://localhost:3000` in dev).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` —
  OAuth app credentials for each provider. Either pair can be left blank; that provider's
  sign-in button just won't work until it's filled in.

## Scripts

| Command                | Does                                     |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Local dev server                         |
| `npm run build`        | Production build                         |
| `npm run lint`         | ESLint                                   |
| `npm run format`       | Prettier — write                         |
| `npm run format:check` | Prettier — check only (CI)               |
| `npm test`             | Vitest, single run                       |
| `npm run db:generate`  | Generate a Drizzle migration from schema |
| `npm run db:migrate`   | Apply pending migrations                 |
| `npm run db:studio`    | Drizzle Studio                           |

## Connecting an MCP client

Generate a personal API key from **Settings → API keys** in the app, then:

```json
{
  "helm": {
    "url": "https://<your-deployment>.vercel.app/api/mcp",
    "headers": { "Authorization": "Bearer <your-api-key>" }
  }
}
```

Every MCP call acts as you, scoped to your active workspace.

## Deploying

Deploy target is Vercel. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and your
OAuth provider credentials as Vercel project env vars (never commit them) — see
[Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying).
