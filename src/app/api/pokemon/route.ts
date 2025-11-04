
import { NextRequest, NextResponse } from 'next/server';
import getPool from '@/db/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session.teamId && !session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const pool = await getPool();
  // If admin provides a teamId query param, return that team's pokemon
  const url = new URL(req.url);
  const teamIdParam = url.searchParams.get('teamId');
  const teamId = session.isAdmin && teamIdParam ? Number(teamIdParam) : session.teamId;

  try {
    const result = await pool.query(
      'SELECT * FROM pokemon WHERE "teamId" = $1 ORDER BY "caughtAt" DESC',
      [teamId]
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const pool = await getPool();
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ message: 'Missing id' }, { status: 400 });
  }

  try {
    await pool.query('DELETE FROM pokemon WHERE id = $1', [id]);
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
