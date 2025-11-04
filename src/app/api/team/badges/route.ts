import { NextRequest, NextResponse } from 'next/server';
import getPool from '@/db/db';
import gymsData from '@/config/gyms.json';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.teamId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const pool = await getPool();

  try {
    // Get team badges from database
    const result = await pool.query(
      'SELECT id, "capturedAt", "gymId" FROM team_badges WHERE "teamId" = $1 ORDER BY "capturedAt"',
      [session.teamId]
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
