import { NextRequest, NextResponse } from 'next/server';
import getPool from '@/db/db';
import gymsData from '@/config/gyms.json';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const teamId = Number(url.searchParams.get('teamId')) || null;
  if (!teamId) return NextResponse.json({ message: 'Missing teamId' }, { status: 400 });

  const pool = await getPool();

  try {
    // Get team badges from database
    const result = await pool.query(
      'SELECT id, "capturedAt", "gymId" FROM team_badges WHERE "teamId" = $1 ORDER BY "capturedAt"',
      [teamId]
    );

    // Join with static gym data
    const badges = result.rows.map(row => {
      const gym = gymsData.find(g => g.id === row.gymId);
      return {
        id: row.id,
        capturedAt: row.capturedAt,
        gymId: row.gymId,
        slug: gym?.slug || '',
        name: gym?.name || ''
      };
    });

    return NextResponse.json(badges);
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
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  try {
    const result = await pool.query('DELETE FROM team_badges WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
