import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.teamId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  return new Promise<NextResponse>((resolve) => {
    const sql = `SELECT tb.id as id, tb.capturedAt as capturedAt, g.id as gymId, g.slug as slug, g.name as name, g.badge_filename as badge_filename
                 FROM team_badges tb
                 JOIN gyms g ON g.id = tb.gymId
                 WHERE tb.teamId = ? ORDER BY tb.capturedAt`;
    db.all(sql, [session.teamId], (err, rows) => {
      if (err) {
        resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
        return;
      }
      resolve(NextResponse.json(rows));
    });
  });
}
