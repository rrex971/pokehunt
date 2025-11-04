import { NextRequest, NextResponse } from 'next/server';
import gymsData from '@/config/gyms.json';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(gymsData);
}

// POST, PUT, DELETE handlers removed: gyms are static configuration

