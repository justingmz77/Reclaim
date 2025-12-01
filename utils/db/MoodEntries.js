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
  },

  // Analytics functions
  getTrends: function(userId, startDate, endDate) {
    try {
      const moodScores = {
        'great': 5,
        'good': 4,
        'okay': 3,
        'bad': 2,
        'terrible': 1
      };

      const entries = db.prepare(`
        SELECT * FROM mood_entries
        WHERE userId = ? AND date BETWEEN ? AND ?
        ORDER BY date ASC
      `).all(userId, startDate, endDate);

      const trends = entries.map(entry => ({
        date: entry.date,
        mood: entry.mood,
        score: moodScores[entry.mood] || 3,
        emoji: entry.emoji,
        hasNote: entry.note && entry.note.length > 0
      }));

      // Calculate average
      const average = trends.length > 0
        ? (trends.reduce((sum, t) => sum + t.score, 0) / trends.length).toFixed(2)
        : 0;

      return {
        success: true,
        trends,
        average,
        count: trends.length
      };
    } catch (error) {
      console.error('Error getting mood trends:', error);
      return { success: false, error: error.message };
    }
  },

  getDistribution: function(userId, startDate, endDate) {
    try {
      const entries = db.prepare(`
        SELECT mood, COUNT(*) as count
        FROM mood_entries
        WHERE userId = ? AND date BETWEEN ? AND ?
        GROUP BY mood
        ORDER BY count DESC
      `).all(userId, startDate, endDate);

      const distribution = {
        great: 0,
        good: 0,
        okay: 0,
        bad: 0,
        terrible: 0
      };

      entries.forEach(entry => {
        distribution[entry.mood] = entry.count;
      });

      const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      const mostCommon = entries.length > 0 ? entries[0].mood : 'okay';

      return {
        success: true,
        distribution,
        total,
        mostCommon
      };
    } catch (error) {
      console.error('Error getting mood distribution:', error);
      return { success: false, error: error.message };
    }
  },

  getCalendarData: function(userId, month, year) {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const daysInMonth = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;

      const entries = db.prepare(`
        SELECT * FROM mood_entries
        WHERE userId = ? AND date BETWEEN ? AND ?
        ORDER BY date ASC
      `).all(userId, startDate, endDate);

      return {
        success: true,
        month,
        year,
        entries: entries.map(e => ({
          date: e.date,
          mood: e.mood,
          emoji: e.emoji,
          hasNote: e.note && e.note.length > 0
        }))
      };
    } catch (error) {
      console.error('Error getting mood calendar data:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = MoodEntries;
