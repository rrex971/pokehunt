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