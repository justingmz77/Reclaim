#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../utils/db');
const DEV_DB = path.join(DB_DIR, 'reclaim.db');
const TEST_DB = path.join(DB_DIR, 'test.db');

const TABLES = [
  'habit_completions',
  'habits',
  'journal_entries',
  'mood_entries',
  'game_scores',
  'users'
];

function cleanDatabase(dbPath, name) {
  if (!fs.existsSync(dbPath)) {
    console.log(`⚠️  ${name} does not exist: ${dbPath}`);
    return false;
  }

  try {
    const db = new Database(dbPath);
    db.pragma('foreign_keys = OFF');

    for (const table of TABLES) {
      try {
        db.exec(`DELETE FROM ${table}`);
      } catch (e) {
        // Table might not exist, skip
      }
    }

    db.pragma('foreign_keys = ON');
    db.close();

    console.log(`✓ Cleaned ${name}: ${dbPath}`);
    return true;
  } catch (error) {
    console.error(`✗ Error cleaning ${name}:`, error.message);
    return false;
  }
}

function showHelp() {
  console.log(`
Usage: node bin/db-clean.js <target>

Targets:
  all     Clean all databases (dev + test)
  dev     Clean development database (reclaim.db)
  test    Clean test database (test.db)

Examples:
  node bin/db-clean.js all
  node bin/db-clean.js test
  npm run db:clean:test
`);
}

// Main
const target = process.argv[2];

switch (target) {
  case 'all':
    console.log('Cleaning all databases...');
    cleanDatabase(DEV_DB, 'dev');
    cleanDatabase(TEST_DB, 'test');
    break;
  case 'dev':
    console.log('Cleaning development database...');
    cleanDatabase(DEV_DB, 'dev');
    break;
  case 'test':
    console.log('Cleaning test database...');
    cleanDatabase(TEST_DB, 'test');
    break;
  default:
    showHelp();
    process.exit(target ? 1 : 0);
}
