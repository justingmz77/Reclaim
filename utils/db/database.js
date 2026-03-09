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

// Prepared statements for user operations
const Users = {
  add: function(id, email, password, role, createdAt) {
    try {
      db.prepare(`
        INSERT INTO users (id, email, password, role, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, email, password, role, createdAt);
      console.log('User added:', id, email, password, role, createdAt);
      return { success: true };
    } catch (error) {
      console.error('Error adding user:', error);
      return { success: false, error: error.message };
    }
  },

  getByEmail: function(email) {
    try {
      const user = db.prepare(`
        SELECT * FROM users WHERE LOWER(email) = LOWER(?)
      `).get(email);
      if (user) {
        return { success: true, user };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  findById: function(id) {
    try {
      const user = db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get(id);
      if (user) {
        return { success: true, user };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  all: function() {
    try {
      const users = db.prepare(`
        SELECT * FROM users
      `).all();
      return { success: true, users };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Prepared statements for game score operations
const GameScores = {
  add: function(id, userId, gameId, score, metadata, completedAt) {
    try {
      db.prepare(`
        INSERT INTO game_scores (id, userId, gameId, score, metadata, completedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, userId, gameId, score, metadata, completedAt);
      console.log('Game score added:', id, userId, gameId, score, completedAt);
      return { success: true };
    } catch (error) {
      console.error('Error adding game score:', error);
      return { success: false, error: error.message };
    }
  },

  getUserScores: function(userId, gameId) {
    try {
      const scores = db.prepare(`
        SELECT * FROM game_scores
        WHERE userId = ? AND gameId = ?
        ORDER BY score DESC, completedAt DESC
      `).all(userId, gameId);
      return { success: true, scores };
    } catch (error) {
      console.error('Error getting user scores:', error);
      return { success: false, error: error.message };
    }
  },

  getTopScores: function(gameId, limit) {
    try {
      const scores = db.prepare(`
        SELECT gs.id, gs.userId, gs.gameId, gs.score, gs.metadata, gs.completedAt, u.email
        FROM game_scores gs
        JOIN users u ON gs.userId = u.id
        WHERE gs.gameId = ?
        ORDER BY gs.score DESC, gs.completedAt ASC
        LIMIT ?
      `).all(gameId, limit);
      return { success: true, scores };
    } catch (error) {
      console.error('Error getting top scores:', error);
      return { success: false, error: error.message };
    }
  },

  getUserBestScore: function(userId, gameId) {
    try {
      const score = db.prepare(`
        SELECT * FROM game_scores
        WHERE userId = ? AND gameId = ?
        ORDER BY score DESC, completedAt ASC
        LIMIT 1
      `).get(userId, gameId);
      if (score) {
        return { success: true, score };
      } else {
        return { success: false, error: 'No scores found' };
      }
    } catch (error) {
      console.error('Error getting user best score:', error);
      return { success: false, error: error.message };
    }
  }
};

// Prepared statements for mood entry operations
const MoodEntries = {
  add: function(id, userId, date, mood, emoji, note, timestamp) {
    try {
      db.prepare(`
        INSERT INTO mood_entries (id, userId, date, mood, emoji, note, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, date, mood, emoji, note, timestamp);
      console.log('Mood entry added:', id, userId, date, mood);
      return { success: true };
    } catch (error) {
      console.error('Error adding mood entry:', error);
      return { success: false, error: error.message };
    }
  },

  update: function(userId, date, mood, emoji, note, timestamp) {
    try {
      const result = db.prepare(`
        UPDATE mood_entries
        SET mood = ?, emoji = ?, note = ?, timestamp = ?
        WHERE userId = ? AND date = ?
      `).run(mood, emoji, note, timestamp, userId, date);
      console.log('Mood entry updated:', userId, date, mood);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('Error updating mood entry:', error);
      return { success: false, error: error.message };
    }
  },

  getUserEntries: function(userId, limit = 30) {
    try {
      const entries = db.prepare(`
        SELECT * FROM mood_entries
        WHERE userId = ?
        ORDER BY date DESC
        LIMIT ?
      `).all(userId, limit);
      return { success: true, entries };
    } catch (error) {
      console.error('Error getting user mood entries:', error);
      return { success: false, error: error.message };
    }
  },

  getByUserAndDate: function(userId, date) {
    try {
      const entry = db.prepare(`
        SELECT * FROM mood_entries
        WHERE userId = ? AND date = ?
      `).get(userId, date);
      if (entry) {
        return { success: true, entry };
      } else {
        return { success: false, error: 'Entry not found' };
      }
    } catch (error) {
      console.error('Error getting mood entry:', error);
      return { success: false, error: error.message };
    }
  },

  delete: function(userId, date) {
    try {
      const result = db.prepare(`
        DELETE FROM mood_entries
        WHERE userId = ? AND date = ?
      `).run(userId, date);
      console.log('Mood entry deleted:', userId, date);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('Error deleting mood entry:', error);
      return { success: false, error: error.message };
    }
  }
};

// Prepared statements for journal entry operations
const JournalEntries = {
  add: function(id, userId, title, content, createdAt) {
    try {
      db.prepare(`
        INSERT INTO journal_entries (id, userId, title, content, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, userId, title, content, createdAt);
      console.log('Journal entry added:', id, userId, title);
      return { success: true };
    } catch (error) {
      console.error('Error adding journal entry:', error);
      return { success: false, error: error.message };
    }
  },

  getUserEntries: function(userId, limit = 100) {
    try {
      const entries = db.prepare(`
        SELECT * FROM journal_entries
        WHERE userId = ?
        ORDER BY createdAt DESC
        LIMIT ?
      `).all(userId, limit);
      return { success: true, entries };
    } catch (error) {
      console.error('Error getting user journal entries:', error);
      return { success: false, error: error.message };
    }
  },

  getById: function(id) {
    try {
      const entry = db.prepare(`
        SELECT * FROM journal_entries
        WHERE id = ?
      `).get(id);
      if (entry) {
        return { success: true, entry };
      } else {
        return { success: false, error: 'Entry not found' };
      }
    } catch (error) {
      console.error('Error getting journal entry:', error);
      return { success: false, error: error.message };
    }
  },

  update: function(id, userId, title, content) {
    try {
      const result = db.prepare(`
        UPDATE journal_entries
        SET title = ?, content = ?
        WHERE id = ? AND userId = ?
      `).run(title, content, id, userId);
      console.log('Journal entry updated:', id, userId);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('Error updating journal entry:', error);
      return { success: false, error: error.message };
    }
  },

  delete: function(id, userId) {
    try {
      const result = db.prepare(`
        DELETE FROM journal_entries
        WHERE id = ? AND userId = ?
      `).run(id, userId);
      console.log('Journal entry deleted:', id, userId);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = { db, Users, GameScores, MoodEntries, JournalEntries };
