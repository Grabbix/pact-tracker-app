const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'app.db'));

// Créer les tables si elles n'existent pas
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone_standard TEXT,
    internal_notes TEXT,
    fai TEXT,
    domains TEXT,
    email_type TEXT,
    mailinblack INTEGER DEFAULT 0,
    arx INTEGER DEFAULT 0,
    arx_quota TEXT,
    eset INTEGER DEFAULT 0,
    eset_version TEXT,
    fortinet INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contact_persons (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    contract_number INTEGER,
    client_name TEXT NOT NULL,
    client_id TEXT,
    total_hours REAL NOT NULL,
    used_hours REAL NOT NULL DEFAULT 0,
    created_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    is_archived INTEGER DEFAULT 0,
    archived_at TEXT,
    contract_type TEXT NOT NULL DEFAULT 'signed',
    signed_date TEXT,
    internal_notes TEXT,
    renewal_quote_id TEXT,
    linked_contract_id TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS interventions (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    hours_used REAL NOT NULL,
    technician TEXT NOT NULL,
    is_billable INTEGER DEFAULT 1,
    location TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
  );
`);

// Add renewal_quote_id and linked_contract_id columns if they don't exist
try {
  db.exec(`
    ALTER TABLE contracts ADD COLUMN renewal_quote_id TEXT;
  `);
  console.log('Added renewal_quote_id column to contracts table');
} catch (e) {
  // Column already exists
}

try {
  db.exec(`
    ALTER TABLE contracts ADD COLUMN linked_contract_id TEXT;
  `);
  console.log('Added linked_contract_id column to contracts table');
} catch (e) {
  // Column already exists
}

module.exports = db;
