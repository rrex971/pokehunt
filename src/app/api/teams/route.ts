
import { NextRequest, NextResponse } from 'next/server';
import getPool from '@/db/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const pool = await getPool();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  // if q is numeric, allow searching by id as well
  const isNumeric = q && /^\d+$/.test(q);
  const likeQ = `%${q}%`;

  try {
    let result;
    if (q) {
      const sql = isNumeric
        ? 'SELECT id, name, pin FROM teams WHERE id = $1 OR name ILIKE $2'
        : 'SELECT id, name, pin FROM teams WHERE name ILIKE $1';
      const params = isNumeric ? [Number(q), likeQ] : [likeQ];
      result = await pool.query(sql, params);
    } else {
      result = await pool.query('SELECT id, name, pin FROM teams');
    }
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const pool = await getPool();
  const { name, pin: providedPin } = await req.json();
  const pin = providedPin && /^\d{4}$/.test(providedPin) ? providedPin : Math.floor(1000 + Math.random() * 9000).toString();

  try {
    const result = await pool.query(
      'INSERT INTO teams (name, pin) VALUES ($1, $2) RETURNING *',
      [name, pin]
    );
    return NextResponse.json(result.rows[0]);
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
    const result = await pool.query('DELETE FROM teams WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
