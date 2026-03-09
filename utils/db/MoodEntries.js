const db = require('./db');

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

module.exports = MoodEntries;
