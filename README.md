# bettertool

A self-hosted Postman / Retool clone. Build apps that make API calls and bind the
results to UI components (tables, inputs, charts) using reactive JavaScript
bindings — all behind your own SSO ingress.

## Stack

- **Frontend:** React + TypeScript + Vite + shadcn/ui (Tailwind v4)
- **Backend:** Node.js + TypeScript + Hono
- **DB:** PostgreSQL + Drizzle ORM
- **Binding engine:** Reactive `{{ js }}` bindings evaluated in a browser QuickJS sandbox
- **Auth:** Trusts `oauth2-proxy` headers from your ingress (configurable)

## Monorepo layout

```
apps/
  api/      Hono server (REST/GraphQL/PG proxy, auth, apps CRUD)
  web/      Vite React app (editor + viewer)
packages/
  shared/   zod schemas + types shared FE/BE
  db/       drizzle schema, migrations, client
  reactive/ reactive binding engine (QuickJS sandbox)
  ui/       shadcn primitives + low-code component registry
```

## Quick start

```bash
pnpm install
cp .env.example .env
docker compose up postgres -d     # or use your own Postgres
pnpm db:push                      # create tables
pnpm dev                          # api on :8787, web on :5173
```

## Development

```bash
pnpm build        # build all packages
pnpm typecheck    # tsc --noEmit across the workspace
pnpm db:generate  # regenerate drizzle migrations
pnpm db:studio    # drizzle studio
```

Put `oauth2-proxy` (or any forward-auth ingress) in front of `api` and configure
the header names via env (see `.env.example`).
