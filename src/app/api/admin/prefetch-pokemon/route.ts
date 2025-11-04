import { NextResponse } from 'next/server';
import getPool from '@/db/db';
import { getSession } from '@/lib/session';

// Batch fetch Pokemon metadata for all caught Pokemon
export async function POST() {
  const session = await getSession();
  if (!session.isAdmin && !session.teamId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const pool = await getPool();

  try {
    // Get all unique Pokemon names from the database
    const result = await pool.query(
      'SELECT DISTINCT name FROM pokemon ORDER BY name'
    );

    const pokemonNames = result.rows.map(row => row.name);

    // Fetch metadata for all Pokemon from cache
    const metaResult = await pool.query(
      'SELECT name, sprite, types FROM poke_meta WHERE name = ANY($1)',
      [pokemonNames]
    );

    // Build a map of Pokemon metadata
    const metaMap: Record<string, { sprite: string; types: string[] }> = {};
    metaResult.rows.forEach(row => {
      try {
        metaMap[row.name] = {
          sprite: row.sprite,
          types: row.types ? JSON.parse(row.types) : []
        };
      } catch (e) {
        metaMap[row.name] = {
          sprite: row.sprite,
          types: []
        };
      }
    });

    // Return both the list of Pokemon and their metadata
    return NextResponse.json({
      pokemon: pokemonNames,
      metadata: metaMap
    });
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
