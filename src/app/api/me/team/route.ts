import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import db from '@/db/db';

export async function GET() {
  const session = await getSession();
  if (!session.teamId) return NextResponse.json({ message: 'No team' }, { status: 404 });

  return new Promise<NextResponse>((resolve) => {
    db.get('SELECT id, name, pin FROM teams WHERE id = ?', [session.teamId], (err: Error | null, row?: { id?: number; name?: string; pin?: string | null } | null) => {
      if (err || !row) {
        resolve(NextResponse.json({ message: 'Not found' }, { status: 404 }));
        return;
      }
  const pinVal = row.pin ? String(row.pin) : null;
  resolve(NextResponse.json({ id: row.id as number, name: row.name as string, pin: pinVal }));
    });
  });
}
