const db = require('./db');

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

module.exports = JournalEntries;
