import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const teamId = Number(url.searchParams.get('teamId')) || null;
  if (!teamId) return NextResponse.json({ message: 'Missing teamId' }, { status: 400 });

  return new Promise<NextResponse>((resolve) => {
    const sql = `SELECT tb.id as id, tb.capturedAt as capturedAt, g.id as gymId, g.slug as slug, g.name as name, g.badge_filename as badge_filename
                 FROM team_badges tb
                 JOIN gyms g ON g.id = tb.gymId
                 WHERE tb.teamId = ? ORDER BY tb.capturedAt`;
    db.all(sql, [teamId], (err, rows) => {
      if (err) {
        resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
        return;
      }
      resolve(NextResponse.json(rows));
    });
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  return new Promise<NextResponse>((resolve) => {
    db.run('DELETE FROM team_badges WHERE id = ?', [id], function (err) {
      if (err) {
        resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
        return;
      }
      if (this.changes === 0) {
        resolve(NextResponse.json({ message: 'Not found' }, { status: 404 }));
        return;
      }
      resolve(NextResponse.json({ ok: true }));
    });
  });
}
