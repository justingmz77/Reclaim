const db = require('./db');

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

module.exports = GameScores;
