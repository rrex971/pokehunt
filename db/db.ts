import { Pool } from 'pg';
import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector';

const connectionMethod = process.env.DB_CONNECTION_METHOD || 'direct';

async function createPool() {
  // Method 1: Cloud SQL Connector (requires GOOGLE_APPLICATION_CREDENTIALS)
  if (connectionMethod === 'connector') {
    console.log('Using Cloud SQL Connector method...');
    console.log('Instance:', process.env.INSTANCE_CONNECTION_NAME);
    console.log('Service Account Key:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    
    const connector = new Connector();
    const clientOpts = await connector.getOptions({
      instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME!,
      ipType: IpAddressTypes.PUBLIC,
    });

    return new Pool({
      ...clientOpts,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000, // Increased to 30 seconds
      query_timeout: 30000, // Query timeout
    });
  }
  
  // Method 2: Direct connection (simpler, no auth required)
  console.log('Using direct connection method...');
  return new Pool({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased to 10 seconds
    ssl: {
      rejectUnauthorized: false, // For Google Cloud SQL public IP connections
    },
    // Add keepalive settings
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });
}

// Create pool and initialize tables
let pool: Pool | undefined;
let initPromise: Promise<void> | undefined;
let tablesInitialized = false;

async function initializeDatabase() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      pool = await createPool();
      console.log('Connected to Google Cloud SQL PostgreSQL database.');
    } catch (err) {
      console.error('Failed to create database pool:', err);
      throw err;
    }
  })();

  return initPromise;
}

async function ensureTablesExist() {
  if (tablesInitialized || !pool) {
    return;
  }

  try {
    // Create teams table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT,
        pin TEXT
      )
    `);

    // Create pokemon table with UNIQUE constraint
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pokemon (
        id SERIAL PRIMARY KEY,
        "teamId" INTEGER REFERENCES teams(id),
        name TEXT,
        "caughtAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("teamId", name)
      )
    `);

    // Create poke_meta table for caching PokeAPI data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS poke_meta (
        name TEXT PRIMARY KEY,
        sprite TEXT,
        types TEXT,
        "fetchedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create team_badges table (no gyms table - gyms are static config)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_badges (
        id SERIAL PRIMARY KEY,
        "teamId" INTEGER REFERENCES teams(id),
        "gymId" INTEGER NOT NULL,
        "capturedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("teamId", "gymId")
      )
    `);

    tablesInitialized = true;
    console.log('Database tables initialized.');
  } catch (err) {
    console.error('Failed to initialize tables (will retry on next request):', err);
    // Don't throw - allow queries to proceed, tables might already exist
  }
}

// Helper to get pool, initializing if needed
async function getPool(): Promise<Pool> {
  if (!pool) {
    await initializeDatabase();
  }
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  
  // Try to ensure tables exist (async, non-blocking)
  if (!tablesInitialized) {
    ensureTablesExist().catch(err => {
      console.error('Background table initialization failed:', err);
    });
  }
  
  return pool;
}

export default getPool;
