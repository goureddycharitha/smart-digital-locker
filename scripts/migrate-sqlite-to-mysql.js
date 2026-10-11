/**
 * SQLite to MySQL Data Migration Script
 * Reads existing records from backend/database/locker.sqlite and transfers to MySQL smart_digital_locker
 */
const fs = require('fs');
const path = require('path');
const Database = require(path.resolve(__dirname, '../backend/node_modules/better-sqlite3'));

const sqlitePath = path.resolve(__dirname, '../backend/database/locker.sqlite');
if (!fs.existsSync(sqlitePath)) {
  console.error('SQLite database not found at:', sqlitePath);
  process.exit(1);
}

const db = new Database(sqlitePath, { readonly: true });
const users = db.prepare('SELECT id, full_name, email, password_hash, created_at, updated_at FROM users').all();
const documents = db.prepare('SELECT id, user_id, title, description, category, original_file_name, stored_file_name, mime_type, file_size, uploaded_at, updated_at FROM documents').all();

console.log(`Found ${users.length} users and ${documents.length} documents in SQLite.`);

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  return "'" + String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

let sql = 'START TRANSACTION;\n';

// Users
for (const u of users) {
  sql += `INSERT INTO users (id, full_name, email, password_hash, role, created_at, updated_at) VALUES (${u.id}, ${escapeSql(u.full_name)}, ${escapeSql(u.email)}, ${escapeSql(u.password_hash)}, 'ROLE_USER', ${escapeSql(u.created_at)}, ${escapeSql(u.updated_at)}) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);\n`;
}

// Documents
for (const d of documents) {
  sql += `INSERT INTO documents (id, user_id, title, description, category, original_file_name, stored_file_name, mime_type, file_size, uploaded_at, updated_at) VALUES (${d.id}, ${d.user_id}, ${escapeSql(d.title)}, ${escapeSql(d.description)}, ${escapeSql(d.category)}, ${escapeSql(d.original_file_name)}, ${escapeSql(d.stored_file_name)}, ${escapeSql(d.mime_type)}, ${d.file_size}, ${escapeSql(d.uploaded_at)}, ${escapeSql(d.updated_at)}) ON DUPLICATE KEY UPDATE title = VALUES(title);\n`;
}

sql += 'COMMIT;\n';

const dumpFile = path.resolve(__dirname, 'migration_dump.sql');
fs.writeFileSync(dumpFile, sql, 'utf-8');
console.log('Migration SQL generated successfully at:', dumpFile);
