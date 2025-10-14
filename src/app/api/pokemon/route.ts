
import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session.teamId && !session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // If admin provides a teamId query param, return that team's pokemon
  const url = new URL(req.url);
  const teamIdParam = url.searchParams.get('teamId');
  const teamId = session.isAdmin && teamIdParam ? Number(teamIdParam) : session.teamId;

  return new Promise<NextResponse>((resolve) => {
    db.all('SELECT * FROM pokemon WHERE teamId = ? ORDER BY caughtAt DESC', [teamId], (err, rows) => {
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
  if (!id) {
    return NextResponse.json({ message: 'Missing id' }, { status: 400 });
  }

  return new Promise<NextResponse>((resolve) => {
    db.run('DELETE FROM pokemon WHERE id = ?', [id], function (err) {
      if (err) {
        resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
        return;
      }
      resolve(NextResponse.json({ message: 'Deleted' }));
    });
  });
}
