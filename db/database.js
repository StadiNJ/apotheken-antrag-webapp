const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Speicherort der SQLite-Datenbank-Datei
const dbPath = path.resolve(__dirname, 'antraege.db');

// Verbindung zur Datenbank
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Fehler beim Verbinden mit der Datenbank', err.message);
  } else {
    console.log('SQLite-Datenbank verbunden ✅');
  }
});

// Tabelle erstellen, falls nicht vorhanden
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS antraege (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pharmacode TEXT NOT NULL UNIQUE,
      artikel TEXT NOT NULL,
      mwst REAL NOT NULL,
      preis REAL NOT NULL,
      email TEXT NOT NULL,
      status TEXT DEFAULT 'offen',
      erstellt_am TEXT DEFAULT CURRENT_TIMESTAMP,
      erfasst_am TEXT
    )
  `);
});

module.exports = db;
