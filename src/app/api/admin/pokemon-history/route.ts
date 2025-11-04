import { NextRequest, NextResponse } from 'next/server';
import getPool from '@/db/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const pool = await getPool();
  const { searchParams } = new URL(req.url);
  const pokemonName = searchParams.get('name') || '';

  try {
    let result;
    if (pokemonName) {
      // Search for specific Pokemon
      result = await pool.query(
        `SELECT p.id, p.name, p."teamId", t.name as "teamName", p."caughtAt"
         FROM pokemon p
         JOIN teams t ON t.id = p."teamId"
         WHERE LOWER(p.name) LIKE LOWER($1)
         ORDER BY p."caughtAt" DESC`,
        [`%${pokemonName}%`]
      );
    } else {
      // Get all Pokemon catches
      result = await pool.query(
        `SELECT p.id, p.name, p."teamId", t.name as "teamName", p."caughtAt"
         FROM pokemon p
         JOIN teams t ON t.id = p."teamId"
         ORDER BY p."caughtAt" DESC
         LIMIT 100`,
        []
      );
    }
    
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
