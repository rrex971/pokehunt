import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import getPool from '@/db/db';

export async function GET() {
  const session = await getSession();
  if (!session.teamId) return NextResponse.json({ message: 'No team' }, { status: 404 });

  const pool = await getPool();

  try {
    const result = await pool.query('SELECT id, name, pin FROM teams WHERE id = $1', [session.teamId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const row = result.rows[0];
    const pinVal = row.pin ? String(row.pin) : null;
    return NextResponse.json({ id: row.id, name: row.name, pin: pinVal });
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
}
