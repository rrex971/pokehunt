
import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  // if q is numeric, allow searching by id as well
  const isNumeric = q && /^\d+$/.test(q);
  const likeQ = `%${q}%`;

  return new Promise<NextResponse>((resolve) => {
    if (q) {
      const sql = isNumeric
        ? 'SELECT id, name, pin FROM teams WHERE id = ? OR name LIKE ?'
        : 'SELECT id, name, pin FROM teams WHERE name LIKE ?';
      const params = isNumeric ? [Number(q), likeQ] : [likeQ];
      db.all(sql, params, (err, rows) => {
        if (err) {
          resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
          return;
        }
        resolve(NextResponse.json(rows));
      });
    } else {
      db.all('SELECT id, name, pin FROM teams', [], (err, rows) => {
        if (err) {
          resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
          return;
        }
        resolve(NextResponse.json(rows));
      });
    }
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { name, pin: providedPin } = await req.json();
  const pin = providedPin && /^\d{4}$/.test(providedPin) ? providedPin : Math.floor(1000 + Math.random() * 9000).toString();

  return new Promise<NextResponse>((resolve) => {
    db.run('INSERT INTO teams (name, pin) VALUES (?, ?)', [name, pin], function (err) {
      if (err) {
        resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
        return;
      }
      resolve(NextResponse.json({ id: this.lastID, name, pin }));
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
    db.run('DELETE FROM teams WHERE id = ?', [id], function (err) {
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
