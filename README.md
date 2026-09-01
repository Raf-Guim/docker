# docker

Base Docker setup and reusable configs for bootstrapping new projects — Dockerfiles, Compose files, and conventions I reuse across services.

This repo is a working example that wires up four services commonly used together:

- `frontend/` — Next.js
- `backend-nest/` — NestJS + Prisma
- `backend-fastapi/` — FastAPI (Python)
- `postgres` — Postgres 16 (official image, no local folder)

No Node or Python needs to be installed on the host — everything runs inside containers.

## Development

The default `docker-compose.yml` and each service's plain `Dockerfile` (not `Dockerfile.production`) make up the dev environment: live-editing via bind mounts, watch mode, no local Node/Python install required. This is what you use day to day.

### How live-editing works

Each service's `Dockerfile` installs its dependencies at **build time**, inside the image. Then `docker-compose.yml` bind-mounts your local source folder (e.g. `./frontend`) into the container at `/app`, so edits made on your machine are picked up immediately by the dev server running in the container (`next dev`, `nest start --watch`, `uvicorn --reload`).

The one catch: a bind mount of the whole folder would also hide the `node_modules` the container installed during build (your host folder doesn't have one). To avoid that, `backend-nest` and `frontend` each get an extra **named volume** mounted specifically at `/app/node_modules`, which sits "on top of" the bind mount and keeps the container's own installed dependencies visible. Python doesn't need this — `pip` installs packages outside `/app`, so there's nothing to shadow.

### First run

```bash
docker compose up --build
```

This builds all three images and starts everything, including Postgres. First run will take a few minutes (downloading base images + installing dependencies).

Once it's up:

- Frontend: http://localhost:3000
- Nest backend: http://localhost:3001
- FastAPI backend: http://localhost:8000
- Postgres: localhost:5432 (user/pass/db from `.env`)

### Create the database table (Prisma)

`backend-nest` ships with a `User` model but no migration yet. Run this once, in a second terminal, while the stack is up:

```bash
docker compose exec backend-nest npx prisma migrate dev --name init
```

This both creates the migration file (committed to `backend-nest/prisma/migrations`, and later applied in production with `prisma migrate deploy` — see [Production](#production)) and applies it to the dev database.

### Day-to-day commands

```bash
docker compose up          # start everything (no rebuild)
docker compose up -d       # start in the background
docker compose down        # stop everything
docker compose logs -f     # tail logs from all services
docker compose logs -f backend-nest   # tail logs from one service
```

### Adding a new dependency

Because `node_modules` lives in a named volume (not on your host), install packages *through* the running container so they land in that volume:

```bash
docker compose exec backend-nest npm install <package>
docker compose exec frontend npm install <package>
```

For Python, add the package to `backend-fastapi/requirements.txt` and rebuild that service:

```bash
docker compose build backend-fastapi
docker compose up -d backend-fastapi
```

### Resetting from scratch

```bash
docker compose down -v   # also removes volumes: node_modules caches AND the Postgres data
```

## Production

Everything above is a **dev** setup: bind mounts, watch mode, live reload. Alongside it, each service also has a `Dockerfile.production` — a multi-stage build that produces a small, self-contained image with no bind mounts and no dev tooling. `docker-compose.prod.yml` wires those together. Nothing here needs to be running day to day; it exists so the repo has a real example of both modes.

Key differences from the dev stack:

- Dependencies are installed and the app is **built** at image-build time (`npm run build` / `next build`), not mounted from your machine at runtime.
- `frontend` runs Next's standalone server (`node server.js`, via `output: 'standalone'`) instead of `next dev`.
- `backend-nest` runs the compiled `dist/main.js` instead of `nest start --watch`; dev-only packages (`@nestjs/cli`, `typescript`) are pruned out of the final image with `npm prune --production`.
- `backend-fastapi` runs `uvicorn` without `--reload`, as a non-root user.
- No bind mounts and no `node_modules` volumes — everything the container needs is already baked into the image.

### Building / running it

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

To run it isolated from the dev stack (different project name + ports, so both can exist at once):

```bash
FRONTEND_PORT=4000 NEST_PORT=4001 FASTAPI_PORT=4002 POSTGRES_PORT=15432 \
  docker compose -f docker-compose.prod.yml -p docker-prod up --build -d
```

### Applying migrations

Dev uses `prisma migrate dev`, which also *creates* new migrations from schema changes. Production only *applies* migrations that already exist in `backend-nest/prisma/migrations` (generated during dev and committed to the repo):

```bash
docker compose -f docker-compose.prod.yml exec backend-nest npx prisma migrate deploy
```

This is why `prisma` lives in `dependencies` rather than `devDependencies` in `backend-nest/package.json` — it needs to survive the production prune so the CLI is still available to run this command.

### Stopping it

```bash
docker compose -f docker-compose.prod.yml down -v
```

## Environment variables

Copy `.env.example` to `.env` (already done in this repo) and adjust ports/credentials as needed. `docker-compose.yml` and `docker-compose.prod.yml` both read from `.env` automatically.
