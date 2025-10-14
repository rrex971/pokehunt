import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return new Promise<NextResponse>((resolve) => {
    db.all('SELECT id, slug, name, description, badge_filename, createdAt FROM gyms ORDER BY id', [], (err, rows) => {
      if (err) {
        resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
        return;
      }
      resolve(NextResponse.json(rows));
    });
  });
}

// POST handler removed: gyms are seeded server-side. Admins can still update/delete via PUT/DELETE.

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id, slug, name, description, badge_filename } = await req.json();
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  return new Promise<NextResponse>((resolve) => {
    db.run('UPDATE gyms SET slug = ?, name = ?, description = ?, badge_filename = ? WHERE id = ?', [slug, name, description || '', badge_filename || '', id], function (err) {
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

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  return new Promise<NextResponse>((resolve) => {
    // perform delete in transaction: remove team_badges referencing this gym, then delete the gym
    db.serialize(() => {
      try {
        db.run('BEGIN TRANSACTION');
        db.run('DELETE FROM team_badges WHERE gymId = ?', [id], (err1) => {
          if (err1) {
            try { db.run('ROLLBACK'); } catch (_) {}
            resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
            return;
          }
          db.run('DELETE FROM gyms WHERE id = ?', [id], function (err2) {
            if (err2) {
              try { db.run('ROLLBACK'); } catch (_) {}
              resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
              return;
            }
            if (this.changes === 0) {
              try { db.run('ROLLBACK'); } catch (_) {}
              resolve(NextResponse.json({ message: 'Not found' }, { status: 404 }));
              return;
            }
            db.run('COMMIT');
            resolve(NextResponse.json({ ok: true }));
          });
        });
      } catch (e) {
        try { db.run('ROLLBACK'); } catch (_) {}
        resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
      }
    });
  });
}
