import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/db';
import { getSession } from '@/lib/session';
import { createHash } from 'crypto';

const SECRET_KEY = process.env.QR_SECRET_KEY as string;

function verifyGymHash(gymSlug: string, hash: string): boolean {
  const expected = createHash('sha256').update(gymSlug + SECRET_KEY).digest('hex');
  return expected === hash;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.teamId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { gymHash } = await req.json();
  if (!gymHash) return NextResponse.json({ message: 'Missing gym data' }, { status: 400 });

  return new Promise<NextResponse>((resolve) => {
    // load all gyms and try to match
    db.all('SELECT id, slug, name FROM gyms', [], (err, rows) => {
      if (err) {
        resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
        return;
      }

      let matched: { id: number; slug: string; name: string } | null = null;
      for (const r of rows) {
        if (verifyGymHash((r as any).slug, gymHash)) {
          matched = r as any;
          break;
        }
      }

      if (!matched) {
        resolve(NextResponse.json({ message: 'Invalid gym' }, { status: 400 }));
        return;
      }

      // check duplicate
      db.get('SELECT id FROM team_badges WHERE teamId = ? AND gymId = ?', [session.teamId, matched.id], (err2, row) => {
        if (err2) {
          resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
          return;
        }
        if (row) {
          resolve(NextResponse.json({ message: `Already captured ${matched!.name}`, name: matched!.name }, { status: 409 }));
          return;
        }

        db.run('INSERT INTO team_badges (teamId, gymId) VALUES (?, ?)', [session.teamId, matched!.id], function (err3) {
          if (err3) {
            resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
            return;
          }
          resolve(NextResponse.json({ message: `Successfully captured ${matched!.name}`, name: matched!.name }));
        });
      });
    });
  });
}
