const db = require('./db');

const Habits = {
  add: function(id, userId, name, description, reminderFrequency, status, createdAt, streak, lastCompletedDate) {
    try {
      db.prepare(`
        INSERT INTO habits (id, userId, name, description, reminderFrequency, status, createdAt, streak, lastCompletedDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, name, description, reminderFrequency, status, createdAt, streak, lastCompletedDate);
      console.log('Habit added:', id, userId, name);
      return { success: true };
    } catch (error) {
      console.error('Error adding habit:', error);
      return { success: false, error: error.message };
    }
  },

  getUserHabits: function(userId, includeCompleted = false) {
    try {
      let query = `
        SELECT * FROM habits
        WHERE userId = ?
      `;

      if (!includeCompleted) {
        query += ` AND status != 'done'`;
      }

      query += ` ORDER BY createdAt DESC`;

      const habits = db.prepare(query).all(userId);
      return { success: true, habits };
    } catch (error) {
      console.error('Error getting user habits:', error);
      return { success: false, error: error.message };
    }
  },

  getById: function(id) {
    try {
      const habit = db.prepare(`
        SELECT * FROM habits
        WHERE id = ?
      `).get(id);
      if (habit) {
        return { success: true, habit };
      } else {
        return { success: false, error: 'Habit not found' };
      }
    } catch (error) {
      console.error('Error getting habit:', error);
      return { success: false, error: error.message };
    }
  },

  update: function(id, userId, name, description, reminderFrequency, status, streak, lastCompletedDate) {
    try {
      const result = db.prepare(`
        UPDATE habits
        SET name = ?, description = ?, reminderFrequency = ?, status = ?, streak = ?, lastCompletedDate = ?
        WHERE id = ? AND userId = ?
      `).run(name, description, reminderFrequency, status, streak, lastCompletedDate, id, userId);
      console.log('Habit updated:', id, userId);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('Error updating habit:', error);
      return { success: false, error: error.message };
    }
  },

  delete: function(id, userId) {
    try {
      const result = db.prepare(`
        DELETE FROM habits
        WHERE id = ? AND userId = ?
      `).run(id, userId);
      console.log('Habit deleted:', id, userId);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('Error deleting habit:', error);
      return { success: false, error: error.message };
    }
  },

  // Habit completions
  addCompletion: function(id, habitId, userId, completedDate) {
    try {
      db.prepare(`
        INSERT INTO habit_completions (id, habitId, userId, completedDate)
        VALUES (?, ?, ?, ?)
      `).run(id, habitId, userId, completedDate);
      console.log('Habit completion added:', habitId, completedDate);
      return { success: true };
    } catch (error) {
      console.error('Error adding habit completion:', error);
      return { success: false, error: error.message };
    }
  },

  getCompletions: function(habitId) {
    try {
      const completions = db.prepare(`
        SELECT * FROM habit_completions
        WHERE habitId = ?
        ORDER BY completedDate DESC
      `).all(habitId);
      return { success: true, completions };
    } catch (error) {
      console.error('Error getting habit completions:', error);
      return { success: false, error: error.message };
    }
  },

  getCompletionByDate: function(habitId, date) {
    try {
      const completion = db.prepare(`
        SELECT * FROM habit_completions
        WHERE habitId = ? AND completedDate = ?
      `).get(habitId, date);
      if (completion) {
        return { success: true, completion };
      } else {
        return { success: false, error: 'Completion not found' };
      }
    } catch (error) {
      console.error('Error getting habit completion:', error);
      return { success: false, error: error.message };
    }
  },

  deleteCompletion: function(habitId, completedDate) {
    try {
      const result = db.prepare(`
        DELETE FROM habit_completions
        WHERE habitId = ? AND completedDate = ?
      `).run(habitId, completedDate);
      console.log('Habit completion deleted:', habitId, completedDate);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('Error deleting habit completion:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = Habits;
