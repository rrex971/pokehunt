import { NextRequest, NextResponse } from 'next/server';
import getPool from '@/db/db';
import gymsData from '@/config/gyms.json';
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

  const pool = await getPool();
  const { gymHash } = await req.json();
  if (!gymHash) return NextResponse.json({ message: 'Missing gym data' }, { status: 400 });

  // Find matching gym from static config
  let matched: { id: number; slug: string; name: string } | null = null;
  for (const gym of gymsData) {
    if (verifyGymHash(gym.slug, gymHash)) {
      matched = gym;
      break;
    }
  }

  if (!matched) {
    return NextResponse.json({ message: 'Invalid gym' }, { status: 400 });
  }

  try {
    // Check for duplicate
    const checkResult = await pool.query(
      'SELECT id FROM team_badges WHERE "teamId" = $1 AND "gymId" = $2',
      [session.teamId, matched.id]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        { message: `Already captured ${matched.name}`, name: matched.name },
        { status: 409 }
      );
    }

    // Insert badge
    await pool.query(
      'INSERT INTO team_badges ("teamId", "gymId") VALUES ($1, $2)',
      [session.teamId, matched.id]
    );

    return NextResponse.json({
      message: `Successfully captured ${matched.name}`,
      name: matched.name
    });
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
