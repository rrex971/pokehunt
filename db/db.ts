
import sqlite3 from 'sqlite3';

const DBSOURCE = 'db/pokehunt.db';

const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    console.error(err.message);
    throw err;
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      pin TEXT
    )`, (err) => {
      if (err) {
        // Table already created
      }
    });

    db.run(`CREATE TABLE pokemon (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teamId INTEGER,
      name TEXT,
      caughtAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teamId) REFERENCES teams (id)
    )`, (err) => {
      if (err) {
        // Table already created
      }
    });

    // Create a table to cache PokeAPI metadata
    db.run(`CREATE TABLE IF NOT EXISTS poke_meta (
      name TEXT PRIMARY KEY,
      sprite TEXT,
      types TEXT,
      fetchedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        // Table creation error
      }
    });

    // Ensure a UNIQUE constraint on (teamId, name) for atomic duplicate prevention.
    // SQLite doesn't support adding a UNIQUE constraint via ALTER TABLE, so we
    // check whether the pokemon table already has a unique index; if not,
    // create a new table with the constraint, copy distinct rows, and swap.
    db.all("PRAGMA index_list('pokemon')", (err, rows) => {
      if (err) return;
      const hasUnique = Array.isArray(rows) && rows.some((r: unknown) => {
        const val = (r as Record<string, unknown>)['unique'];
        return Number(val) === 1;
      });
      if (!hasUnique) {
        db.serialize(() => {
          try {
            db.run('BEGIN TRANSACTION');
            db.run(`CREATE TABLE IF NOT EXISTS pokemon_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              teamId INTEGER,
              name TEXT,
              caughtAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(teamId, name),
              FOREIGN KEY (teamId) REFERENCES teams (id)
            )`);
            // Copy rows, using INSERT OR IGNORE to avoid violating unique constraint
            db.run(`INSERT OR IGNORE INTO pokemon_new (id, teamId, name, caughtAt)
                    SELECT id, teamId, name, caughtAt FROM pokemon`);
            db.run('DROP TABLE IF EXISTS pokemon');
            db.run('ALTER TABLE pokemon_new RENAME TO pokemon');
            db.run('COMMIT');
          } catch (e) {
            try { db.run('ROLLBACK'); } catch (_) {}
          }
        });
      }
    });

    // Create gyms table and team_badges table to track gym completions/badges
    db.run(`CREATE TABLE IF NOT EXISTS gyms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE,
      name TEXT,
      description TEXT,
      badge_filename TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        // ignore
      }
    });

    // Seed default gyms (safe to run multiple times)
    const defaultGyms = [
      { slug: 'dark', name: 'Dark Gym', badge: 'dark.svg' },
      { slug: 'ghost', name: 'Ghost Gym', badge: 'ghost.svg' },
      { slug: 'psychic', name: 'Psychic Gym', badge: 'psychic.svg' },
      { slug: 'electric', name: 'Electric Gym', badge: 'electric.svg' },
      { slug: 'fire', name: 'Fire Gym', badge: 'fire.svg' },
      { slug: 'water', name: 'Water Gym', badge: 'water.svg' },
      { slug: 'normal', name: 'Normal Gym', badge: 'normal.svg' },
      { slug: 'ground', name: 'Ground Gym', badge: 'ground.svg' },
    ];
    try {
      const stmt = db.prepare('INSERT OR IGNORE INTO gyms (slug, name, description, badge_filename) VALUES (?, ?, ?, ?)');
      for (const g of defaultGyms) {
        stmt.run(g.slug, g.name, '', g.badge);
      }
      stmt.finalize();
    } catch (e) {
      // ignore seeding errors
    }

    db.run(`CREATE TABLE IF NOT EXISTS team_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teamId INTEGER,
      gymId INTEGER,
      capturedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(teamId, gymId),
      FOREIGN KEY (teamId) REFERENCES teams (id),
      FOREIGN KEY (gymId) REFERENCES gyms (id)
    )`, (err) => {
      if (err) {
        // ignore
      }
    });
  }
});

export default db;
