const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let dbInstance = null;

/**
 * Initializes and returns the SQLite database connection.
 * Automatically runs schema.sql to ensure tables and indexes exist.
 *
 * @param {string} [customPath] - Optional custom path for tests (e.g. ':memory:')
 * @returns {Database} The better-sqlite3 database instance
 */
function initDatabase(customPath) {
  if (dbInstance) {
    return dbInstance;
  }

  const rawPath = customPath || process.env.DB_PATH || './database/locker.sqlite';
  let db;

  if (rawPath === ':memory:') {
    db = new Database(':memory:');
  } else {
    const fullPath = path.isAbsolute(rawPath)
      ? rawPath
      : path.resolve(process.cwd(), rawPath);

    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(fullPath);
  }

  // Enforce foreign key constraints in SQLite
  db.pragma('foreign_keys = ON');

  // Use WAL mode for file-based DBs for better concurrency
  if (rawPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }

  // Load and execute schema definitions
  const schemaPath = path.resolve(__dirname, '../database/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  dbInstance = db;
  return dbInstance;
}

/**
 * Returns the active database instance. Initializes if not already created.
 * @returns {Database}
 */
function getDatabase() {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

/**
 * Closes the active database connection (useful during testing or graceful shutdown).
 */
function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore if already closed
    }
    dbInstance = null;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};
