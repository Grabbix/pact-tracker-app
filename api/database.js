const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'app.db'));

// Créer les tables si elles n'existent pas
db.exec(`
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

module.exports = db;
