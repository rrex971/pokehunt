# Pokéhunt

Small Next.js (App Router + TypeScript) app for capturing gym badges and hunting Pokémon.

This repository contains a minimal local project used for development and testing. It seeds a set of gyms on startup so you don't need to create them manually.

## Quickstart

1. Install dependencies

```bash
npm install
```

2. Start the dev server

```bash
npm run dev
```

3. Open the app

Visit http://localhost:3000 in your browser.

## Seeded Gyms & Badges

On startup the server seeds the following gyms into the SQLite database (file: `db/pokehunt.db`) using `INSERT OR IGNORE` so the seed is idempotent:

- dark (badge: `/badges/dark.svg`)
- ghost (badge: `/badges/ghost.svg`)
- psychic (badge: `/badges/psychic.svg`)
- electric (badge: `/badges/electric.svg`)
- fire (badge: `/badges/fire.svg`)
- water (badge: `/badges/water.svg`)
- normal (badge: `/badges/normal.svg`)
- ground (badge: `/badges/ground.svg`)

Badges are simple emoji-based SVGs in `public/badges/` and include a small drop shadow for better visibility.

## DB schema (quick)

- gyms: id, slug, name, description, badge_filename
- team_badges: id, team_name, badge_slug, awarded_at

## Admin UI

The admin page (`/admin`) lists gyms and allows updating or deleting them. The ability to add gyms from the frontend has been removed — gyms are provided by the seed.

## Gym tokens / QR URLs

Gym tokens are computed as sha256(slug + QR_SECRET_KEY) and encoded as hex. If you need to generate a token for a seeded gym locally, run a small Node snippet (replace the `QR_SECRET_KEY` with the one in your environment if different):

```js
// run with: node -e "<paste>"
const crypto = require('crypto');
const slug = 'dark';
const secret = process.env.QR_SECRET_KEY || 'mismagius';
const token = crypto.createHash('sha256').update(slug + secret).digest('hex');
console.log(token);
console.log(`http://localhost:3000/gym?p=${token}`);
```

## Build & Deployment

These steps show a typical production build and run for a Next.js app. Adjust environment variables as needed.

1. Install dependencies (if not already done)

```bash
npm ci
```

2. Build the app for production

```bash
npm run build
```

3. Start the production server

```bash
NODE_ENV=production
QR_SECRET_KEY="your-secret-here"
PORT=3000
npm run start
```

Environment variables to consider:

- `QR_SECRET_KEY` — secret used to compute gym tokens (required for QR/token validation)
- `PORT` — TCP port Next.js should listen on (defaults to 3000)
- Any other env vars your deployment environment requires (DB paths, SENTRY, etc.)

Docker example (simple):

```Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm","run","start"]
```

Build & run the image:

```bash
docker build -t pokehunt:latest .
docker run -e QR_SECRET_KEY="your-secret" -p 3000:3000 pokehunt:latest
```

Notes:

- This project uses SQLite by default and stores the DB file in `db/pokehunt.db`. When running in Docker or in production, ensure the `db/` directory is persisted in a volume or placed on a writable filesystem so data is retained across container restarts.
- For multi-instance deployments, consider moving to a shared database (Postgres, etc.) and updating `db/db.ts` accordingly.
