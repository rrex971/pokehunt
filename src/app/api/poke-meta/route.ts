import { NextRequest, NextResponse } from 'next/server';
import getPool from '@/db/db';
import sharp from 'sharp';

type PokeMeta = {
  sprite: string | null;
  types: string[];
};

// Allow explicit overrides for cases where the display name doesn't map cleanly
// to a PokeAPI endpoint. Keys are the displayed names used in the app and
// values are either the PokeAPI name (string) or the numeric Pokédex id (number).
// Edit this map to add exceptions like: { "Mega Gardevoir": "gardevoir-mega" }
const POKEAPI_OVERRIDES: Record<string, string | number> = {
  // Mega forms with irregular naming
  "Mega Gardevoir": "gardevoir-mega",
  "Mega Charizard-X": "charizard-mega-x",
  "Mega Charizard-Y": "charizard-mega-y",
  "Mega Blastoise": "blastoise-mega",
  "Mega Gyarados": "gyarados-mega",
  "Mega Venusaur": "venusaur-mega",
  "Mega Sceptile": "sceptile-mega",
  // Porygon-Z
  "PorygonZ": "porygon-z",
  // Rotom forms
  "Rotom Frost": "rotom-frost",
  "Rotom Heat": "rotom-heat",
  "Rotom Wash": "rotom-wash",
  "Rotom Fan": "rotom-fan",
  "Rotom Mow": "rotom-mow",
  // Regional forms and special formatting
  "Exeggutor-Alola": "exeggutor-alola",
  "Dugtrio-Alola": "dugtrio-alola",
  "Ninetales-Alola": "ninetales-alola",
  "Golem-Alola": "golem-alola",
  "Sandslash-Alola": "sandslash-alola",
  // Special names
  "Mr. Mime": "mr-mime",
  "Sirfetch'd": "sirfetchd",
  // Common mega forms from list
  "Mega Swampert": "swampert-mega",
  "Mega Abomasnow": "abomasnow-mega",
  "Mega Pidgeot": "pidgeot-mega",
  "Mega Aerodactyl": "aerodactyl-mega",
  "Mega Camerupt": "camerupt-mega",
  "Mega Heracross": "heracross-mega",
  "Mega Medicham": "medicham-mega",
  "Mega Garchomp": "garchomp-mega",
  "Mega Altaria": "altaria-mega",
  "Mega Lopunny": "lopunny-mega",
  "Mega Audino": "audino-mega",
  "Mega Manectric": "manectric-mega",
  "Mega Ampharos": "ampharos-mega",
  "Mega Aggron": "aggron-mega",
  "Mega Steelix": "steelix-mega",
  "Mega Absol": "absol-mega",
  "Mega Sharpedo": "sharpedo-mega",
  // feel free to add more mappings here


  "Dudunsparce": "dudunsparce-two-segment",
  "Morpeko": "morpeko-full-belly",
  "Indeedee": "indeedee-male",
  "Mimikyu": "mimikyu-disguised",
  "Meowstic": "meowstic-female",
  "Minior": "minior-red-meteor",
  "Lycanroc": "lycanroc-midday",
  "Darmanitan": "darmanitan-standard",
};

async function fetchFromPokeAPI(name: string): Promise<PokeMeta | null> {
  function normalizeForPokeApi(src: string) {
    // If the displayed name starts with 'Mega ', default to '<name>-mega'
    // (this is a reasonable default but many mega names are irregular and
    // should be provided in POKEAPI_OVERRIDES).
    if (src.startsWith('Mega ')) {
      const rest = src.slice(5).trim();
      const safe = rest.toLowerCase().replace(/["']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      return `${safe}-mega`;
    }
    // General normalization: lowercase, remove quotes/periods, replace non-alphanum with hyphens
    return src.toLowerCase().replace(/["']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  try {
    let endpoint: string | number;
    if (Object.prototype.hasOwnProperty.call(POKEAPI_OVERRIDES, name)) {
      endpoint = POKEAPI_OVERRIDES[name];
    } else {
      endpoint = normalizeForPokeApi(name);
    }

    const url = typeof endpoint === 'number'
      ? `https://pokeapi.co/api/v2/pokemon/${endpoint}`
      : `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(String(endpoint))}`;

    const res = await fetch(url);
    if (!res.ok) return null;
    const jd = await res.json();
    // Prefer official artwork, then dream_world, then front_default
    const sprite = jd?.sprites?.other?.['official-artwork']?.front_default
      || jd?.sprites?.other?.dream_world?.front_default
      || jd?.sprites?.front_default
      || null;
    const types: string[] = Array.isArray(jd?.types)
      ? jd.types.map((t: unknown) => {
          const maybe = t as { type?: { name?: unknown } } | null;
          return typeof maybe?.type?.name === 'string' ? maybe.type.name : '';
        }).filter(Boolean)
      : [];
    return { sprite, types };
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const name = url.searchParams.get('name');
  if (!name) return NextResponse.json({ message: 'Missing name' }, { status: 400 });

  const pool = await getPool();

  try {
    // Check cache
    const result = await pool.query('SELECT * FROM poke_meta WHERE name = $1', [name]);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      try {
        const types = row.types ? JSON.parse(row.types) : [];
        return NextResponse.json({ name: row.name, sprite: row.sprite, types });
      } catch (e) {
        return NextResponse.json({ name: row.name, sprite: row.sprite, types: [] });
      }
    }

    // Not cached: fetch from PokeAPI and insert into cache
    const meta = await fetchFromPokeAPI(name);
    if (!meta) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    // Attempt server-side cropping and resizing using sharp
    let processedSprite: string | null = meta.sprite;
    try {
      if (meta.sprite) {
        const remote = await fetch(meta.sprite);
        if (remote.ok) {
          const arrayBuf = await remote.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          // use sharp trim to remove transparent border, then resize to 128px max
          const out = await sharp(buffer)
            .trim()
            .resize({ width: 128, height: 128, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
          processedSprite = `data:image/png;base64,${out.toString('base64')}`;
        }
      }
    } catch (e) {
      // fall back to original remote sprite on error
      processedSprite = meta.sprite;
    }

    const typesStr = JSON.stringify(meta.types || []);
    
    try {
      await pool.query(
        'INSERT INTO poke_meta (name, sprite, types, "fetchedAt") VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (name) DO UPDATE SET sprite = $2, types = $3, "fetchedAt" = CURRENT_TIMESTAMP',
        [name, processedSprite, typesStr]
      );
    } catch (err2) {
      // return what we fetched even if DB write fails
      console.error('Cache write error:', err2);
    }
    
    return NextResponse.json({ name, sprite: processedSprite, types: meta.types });
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // allow explicit refresh: body { name }
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const name = typeof body.name === 'string' ? body.name : '';
  if (!name) return NextResponse.json({ message: 'Missing name' }, { status: 400 });
  
  const meta = await fetchFromPokeAPI(name);
  if (!meta) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  
  const pool = await getPool();
  const typesStr = JSON.stringify(meta.types || []);

  try {
    await pool.query(
      'INSERT INTO poke_meta (name, sprite, types, "fetchedAt") VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (name) DO UPDATE SET sprite = $2, types = $3, "fetchedAt" = CURRENT_TIMESTAMP',
      [name, meta.sprite, typesStr]
    );
    return NextResponse.json({ name, sprite: meta.sprite, types: meta.types });
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
