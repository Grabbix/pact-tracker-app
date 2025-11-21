const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'app.db'));

// Add new fields to projects table
const columnsToAdd = [
  'mailinblack_fields TEXT',
  'eset_fields TEXT',
  'server_fields TEXT',
  'audit_fields TEXT',
  'firewall_fields TEXT',
  'mail_fields TEXT',
  'custom_fields TEXT'
];

columnsToAdd.forEach(column => {
  try {
    const columnName = column.split(' ')[0];
    db.exec(`ALTER TABLE projects ADD COLUMN ${column};`);
    console.log(`Added ${columnName} column to projects table`);
  } catch (e) {
    // Column already exists
  }
});

console.log('Database migration completed');
db.close();
