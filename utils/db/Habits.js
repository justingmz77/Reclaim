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
  },

  // Analytics functions
  getCompletionRatesByDateRange: function(userId, startDate, endDate) {
    try {
      const habitsResult = this.getUserHabits(userId, false);
      if (!habitsResult.success) return habitsResult;

      const habits = habitsResult.habits;
      const totalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

      const habitRates = habits.map(habit => {
        const completions = db.prepare(`
          SELECT COUNT(*) as count
          FROM habit_completions
          WHERE habitId = ? AND completedDate BETWEEN ? AND ?
        `).get(habit.id, startDate, endDate);

        return {
          habitId: habit.id,
          name: habit.name,
          completed: completions.count,
          total: totalDays,
          rate: totalDays > 0 ? (completions.count / totalDays * 100).toFixed(1) : 0,
          streak: habit.streak
        };
      });

      return { success: true, rates: habitRates };
    } catch (error) {
      console.error('Error calculating completion rates:', error);
      return { success: false, error: error.message };
    }
  },

  getStatistics: function(userId) {
    try {
      const habitsResult = this.getUserHabits(userId, true);
      if (!habitsResult.success) return habitsResult;

      const allHabits = habitsResult.habits;
      const activeHabits = allHabits.filter(h => h.status === 'in_progress');
      const completedHabits = allHabits.filter(h => h.status === 'done');

      let totalCompletions = 0;
      let activeStreaks = 0;
      let longestStreak = { name: '', days: 0, habitId: '' };

      const today = new Date().toISOString().split('T')[0];
      let completedToday = 0;

      for (const habit of allHabits) {
        const completionsResult = this.getCompletions(habit.id);
        if (completionsResult.success) {
          totalCompletions += completionsResult.completions.length;

          // Check if completed today
          if (completionsResult.completions.some(c => c.completedDate === today)) {
            completedToday++;
          }
        }

        if (habit.streak > 0) activeStreaks++;
        if (habit.streak > longestStreak.days) {
          longestStreak = { name: habit.name, days: habit.streak, habitId: habit.id };
        }
      }

      return {
        success: true,
        statistics: {
          totalHabits: allHabits.length,
          activeHabits: activeHabits.length,
          completedHabits: completedHabits.length,
          totalCompletions,
          activeStreaks,
          longestStreak,
          completedToday,
          completionRateToday: activeHabits.length > 0 ? ((completedToday / activeHabits.length) * 100).toFixed(1) : 0
        }
      };
    } catch (error) {
      console.error('Error getting habit statistics:', error);
      return { success: false, error: error.message };
    }
  },

  getCalendarData: function(userId, month, year) {
    try {
      const habitsResult = this.getUserHabits(userId, false);
      if (!habitsResult.success) return habitsResult;

      const habits = habitsResult.habits;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const daysInMonth = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;

      const calendarData = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const completedHabits = habits.filter(habit => {
          const completionsResult = this.getCompletions(habit.id);
          if (!completionsResult.success) return false;
          return completionsResult.completions.some(c => c.completedDate === dateStr);
        });

        calendarData.push({
          date: dateStr,
          completed: completedHabits.length,
          total: habits.length,
          rate: habits.length > 0 ? (completedHabits.length / habits.length * 100).toFixed(1) : 0,
          habits: completedHabits.map(h => ({ id: h.id, name: h.name }))
        });
      }

      return { success: true, calendarData };
    } catch (error) {
      console.error('Error getting calendar data:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = Habits;
