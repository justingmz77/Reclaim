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

module.exports = { db, Users, GameScores };
