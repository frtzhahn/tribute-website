// init sqlite connection
// handle db exports

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "memorybook.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("[DB] Failed to connect to SQLite:", err.message);
    process.exit(1);
  }
  console.log("[DB] Connected to SQLite database at", DB_PATH);
});

// enable fast concurrent reads
db.run("PRAGMA journal_mode = WAL;");

// bootstrap images table schema
db.run(
  `CREATE TABLE IF NOT EXISTS images (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filepath    TEXT    NOT NULL,
    description TEXT,
    status      TEXT    DEFAULT 'pending'
  )`,
  (err) => {
    if (err) {
      console.error("[DB] Failed to create images table:", err.message);
    } else {
      console.log("[DB] images table ready.");
    }
  }
);

// schema migration for views
db.run("ALTER TABLE images ADD COLUMN view_count INTEGER DEFAULT 0", (err) => {
  if (err && !err.message.includes("duplicate column name")) {
    console.error("[DB] Failed to add view_count column:", err.message);
  } else if (!err) {
    console.log("[DB] view_count column added successfully.");
  }
});

module.exports = db;
