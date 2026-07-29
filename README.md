# Daylog

Self-hosted worklog. One Next.js app that's both:

1. An **MCP server** (`/api/mcp`) so Claude can log or query work mid-conversation.
2. A **dashboard** (`/`) to browse, filter, and edit entries by hand.

Single user, no accounts. See `CLAUDE.md` for the full spec.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and WORKLOG_API_KEY
npm run db:migrate           # apply schema to your Neon database
npm run dev
```

- `DATABASE_URL` — Neon **pooled** connection string (the `-pooler` host).
- `WORKLOG_API_KEY` — any long random secret; generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
  Required as a `Bearer` token on every `/api/mcp` and `/api/entries` request.

## Scripts

| Command                | Does                                     |
| ---------------------- | ---------------------------------------- |
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

```json
{
  "daylog": {
    "url": "https://<your-deployment>.vercel.app/api/mcp",
    "headers": { "Authorization": "Bearer <WORKLOG_API_KEY>" }
  }
}
```

## Deploying

Deploy target is Vercel. Set `DATABASE_URL` and `WORKLOG_API_KEY` as Vercel
project env vars (never commit them) — see
[Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying).
