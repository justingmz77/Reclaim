const db = require('./db');

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

module.exports = Users;
