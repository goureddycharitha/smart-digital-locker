const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, 'locker.sqlite');

if (!fs.existsSync(dbPath)) {
  console.log(`❌ Database file not found at: ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);

console.log('\n============================= DATABASE: locker.sqlite =============================\n');

// 1. Users Table
console.log('📋 TABLE: users');
const users = db.prepare('SELECT id, full_name, email, created_at FROM users ORDER BY id ASC').all();
if (users.length === 0) {
  console.log('Empty table (0 rows)\n');
} else {
  console.table(users);
}

// 2. Documents Table
console.log('📋 TABLE: documents');
const docs = db.prepare(`
  SELECT id, user_id, title, category, original_file_name, file_size, uploaded_at 
  FROM documents 
  ORDER BY id ASC
`).all();

if (docs.length === 0) {
  console.log('Empty table (0 rows)\n');
} else {
  console.table(docs);
}

console.log('===================================================================================\n');
db.close();
