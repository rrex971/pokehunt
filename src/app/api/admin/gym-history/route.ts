import { NextRequest, NextResponse } from 'next/server';
import getPool from '@/db/db';
import { getSession } from '@/lib/session';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const nameQuery = searchParams.get('name');

    const pool = await getPool();

    // Load gyms from config file
    const gymsPath = path.join(process.cwd(), 'config', 'gyms.json');
    const gymsData = JSON.parse(fs.readFileSync(gymsPath, 'utf-8'));
    const gymsMap = new Map(gymsData.map((g: any) => [g.id, g]));

    let query = `
      SELECT 
        tb.id,
        tb."gymId",
        tb."teamId",
        t.name as "teamName",
        tb."capturedAt"
      FROM team_badges tb
      JOIN teams t ON t.id = tb."teamId"
      ORDER BY tb."capturedAt" DESC
    `;

    // Limit results if no search query
    if (!nameQuery) {
      query += ` LIMIT 100`;
    }

    const result = await pool.query(query);
    
    // Enrich with gym names and filter by search if needed
    let rows = result.rows.map(row => {
      const gym = gymsMap.get(row.gymId) as any;
      return {
        ...row,
        gymName: gym?.name || 'Unknown Gym'
      };
    });

    // Filter by gym name if search query provided
    if (nameQuery && nameQuery.trim()) {
      const searchLower = nameQuery.trim().toLowerCase();
      rows = rows.filter(row => 
        row.gymName.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching gym history:', error);
    return NextResponse.json(
      { message: 'Failed to fetch gym history' },
      { status: 500 }
    );
  }
}
