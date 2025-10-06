import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;

export const initDatabase = async () => {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`
  });

  // Try to load existing database from localStorage
  const savedDb = localStorage.getItem('sqlite-db');
  if (savedDb) {
    const uint8Array = new Uint8Array(JSON.parse(savedDb));
    db = new SQL.Database(uint8Array);
  } else {
    db = new SQL.Database();
    // Create tables
    db.run(`
      CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        total_hours REAL NOT NULL,
        used_hours REAL NOT NULL DEFAULT 0,
        created_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        is_archived INTEGER DEFAULT 0,
        archived_at TEXT
      );

      CREATE TABLE IF NOT EXISTS interventions (
        id TEXT PRIMARY KEY,
        contract_id TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        hours_used REAL NOT NULL,
        technician TEXT NOT NULL,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
      );
    `);
    saveDatabase();
  }

  return db;
};

export const saveDatabase = () => {
  if (db) {
    const data = db.export();
    const buffer = Array.from(data);
    localStorage.setItem('sqlite-db', JSON.stringify(buffer));
  }
};

export const getDatabase = () => db;

export const generateId = () => {
  return crypto.randomUUID();
};
