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
    fortinet_serial_number TEXT,
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

  CREATE TABLE IF NOT EXISTS arx_accounts (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ok',
    last_backup_date TEXT,
    used_space_gb REAL,
    allowed_space_gb REAL,
    last_updated TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS arx_account_history (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL,
    last_backup_date TEXT,
    used_space_gb REAL,
    allowed_space_gb REAL,
    analyzed_size_gb REAL,
    FOREIGN KEY (account_id) REFERENCES arx_accounts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_arx_history_account_date 
    ON arx_account_history(account_id, recorded_at DESC);

  CREATE TABLE IF NOT EXISTS billing_items (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    description TEXT NOT NULL,
    technician TEXT NOT NULL,
    is_processed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cron_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    trigger_type TEXT DEFAULT 'cron'
  );

  CREATE INDEX IF NOT EXISTS idx_cron_logs_timestamp ON cron_logs(timestamp DESC);

  CREATE TABLE IF NOT EXISTS notification_settings (
    id TEXT PRIMARY KEY,
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_user TEXT NOT NULL,
    smtp_password TEXT NOT NULL,
    smtp_secure INTEGER DEFAULT 0,
    smtp_from TEXT NOT NULL,
    email_to TEXT NOT NULL,
    triggers TEXT NOT NULL DEFAULT '{"contract_full":true}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notification_logs (
    id TEXT PRIMARY KEY,
    contract_id TEXT,
    notification_type TEXT NOT NULL,
    email_to TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_notification_logs_sent ON notification_logs(sent_at DESC);

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    project_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'à organiser',
    title TEXT NOT NULL,
    description TEXT,
    delivery_date TEXT,
    mailinblack_fields TEXT,
    eset_fields TEXT,
    server_fields TEXT,
    audit_fields TEXT,
    firewall_fields TEXT,
    mail_fields TEXT,
    custom_fields TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    is_archived INTEGER DEFAULT 0,
    archived_at TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_notes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0,
    completed_at TEXT,
    completion_details TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
  CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_project_notes_project ON project_notes(project_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);

  CREATE TABLE IF NOT EXISTS project_templates (
    id TEXT PRIMARY KEY,
    project_type TEXT NOT NULL UNIQUE,
    default_tasks TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
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

// Add analyzed_size_gb column to arx_accounts if it doesn't exist
try {
  db.exec(`
    ALTER TABLE arx_accounts ADD COLUMN analyzed_size_gb REAL;
  `);
  console.log('Added analyzed_size_gb column to arx_accounts table');
} catch (e) {
  // Column already exists
}

// Add trigger_type column to cron_logs if it doesn't exist
try {
  db.exec(`
    ALTER TABLE cron_logs ADD COLUMN trigger_type TEXT DEFAULT 'cron';
  `);
  console.log('Added trigger_type column to cron_logs table');
} catch (e) {
  // Column already exists
}

// Add details column to cron_logs if it doesn't exist
try {
  db.exec(`
    ALTER TABLE cron_logs ADD COLUMN details TEXT;
  `);
  console.log('Added details column to cron_logs table');
} catch (e) {
  // Column already exists
}

module.exports = db;
