const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'reclaim.db');
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'admin')),
    createdAt TEXT NOT NULL
  )
`);

// Create game_scores table
db.exec(`
  CREATE TABLE IF NOT EXISTS game_scores (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    gameId TEXT NOT NULL,
    score INTEGER NOT NULL,
    metadata TEXT,
    completedAt TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id)
  )
`);

// Create index on userId and gameId for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_game_scores_user_game
  ON game_scores(userId, gameId)
`);

// Create mood_entries table
db.exec(`
  CREATE TABLE IF NOT EXISTS mood_entries (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    mood TEXT NOT NULL CHECK(mood IN ('great', 'good', 'okay', 'bad', 'terrible')),
    emoji TEXT NOT NULL,
    note TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id),
    UNIQUE(userId, date)
  )
`);

// Create index on userId for mood entries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_mood_entries_user
  ON mood_entries(userId)
`);

// Create journal_entries table
db.exec(`
  CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id)
  )
`);

// Create index on userId for journal entries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_journal_entries_user
  ON journal_entries(userId)
`);

// Create habits table
db.exec(`
  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    reminderFrequency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'done')),
    createdAt TEXT NOT NULL,
    streak INTEGER NOT NULL DEFAULT 0,
    lastCompletedDate TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  )
`);

// Create index on userId for habits
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_habits_user
  ON habits(userId)
`);

// Create habit_completions table (for tracking completion history)
db.exec(`
  CREATE TABLE IF NOT EXISTS habit_completions (
    id TEXT PRIMARY KEY,
    habitId TEXT NOT NULL,
    userId TEXT NOT NULL,
    completedDate TEXT NOT NULL,
    FOREIGN KEY(habitId) REFERENCES habits(id) ON DELETE CASCADE,
    FOREIGN KEY(userId) REFERENCES users(id),
    UNIQUE(habitId, completedDate)
  )
`);

// Create index on habitId for completions
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_habit_completions_habit
  ON habit_completions(habitId)
`);

module.exports = db;
