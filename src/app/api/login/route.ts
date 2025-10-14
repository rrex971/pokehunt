
import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await getSession();
  const { teamId, pin } = await req.json();

  if (teamId === 'admin' && pin === process.env.NEXT_PUBLIC_ADMIN_PIN) {
    session.isAdmin = true;
    await session.save();
    return NextResponse.json({ ok: true, isAdmin: true });
  }

  return new Promise<NextResponse>((resolve) => {
    db.get('SELECT * FROM teams WHERE id = ? AND pin = ?', [teamId, pin], async (err, row: { id: number } | undefined) => {
      if (err) {
        resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
        return;
      }
      if (row) {
        session.teamId = row.id;
        await session.save();
        resolve(NextResponse.json({ ok: true, isAdmin: false }));
      } else {
        resolve(NextResponse.json({ message: 'Invalid Team ID or PIN' }, { status: 401 }));
      }
    });
  });
}
