
import { NextRequest, NextResponse } from 'next/server';
import getPool from '@/db/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await getSession();
  const { teamId, pin } = await req.json();

  if (teamId === 'admin' && pin === process.env.NEXT_PUBLIC_ADMIN_PIN) {
    session.isAdmin = true;
    await session.save();
    return NextResponse.json({ ok: true, isAdmin: true });
  }

  const pool = await getPool();

  try {
    const result = await pool.query('SELECT * FROM teams WHERE id = $1 AND pin = $2', [teamId, pin]);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      session.teamId = row.id;
      await session.save();
      return NextResponse.json({ ok: true, isAdmin: false });
    } else {
      return NextResponse.json({ message: 'Invalid Team ID or PIN' }, { status: 401 });
    }
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
