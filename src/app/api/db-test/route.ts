import { NextResponse } from 'next/server';
import getPool from '@/db/db';

export async function GET() {
  try {
    const pool = await getPool();
    
    // Try a simple query
    const result = await pool.query('SELECT NOW() as current_time');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      currentTime: result.rows[0].current_time,
      connectionInfo: {
        host: process.env.PGHOST,
        port: process.env.PGPORT,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        method: process.env.DB_CONNECTION_METHOD || 'direct',
      },
    });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      stack: error.stack,
      connectionInfo: {
        host: process.env.PGHOST,
        port: process.env.PGPORT,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        method: process.env.DB_CONNECTION_METHOD || 'direct',
      },
    }, { status: 500 });
  }
}
