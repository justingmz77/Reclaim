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
  },

  update: function(id, updates) {
    try {
      // Build dynamic UPDATE query based on provided fields
      const fields = [];
      const values = [];
      
      if (updates.role !== undefined) {
        fields.push('role = ?');
        values.push(updates.role);
      }
      
      if (updates.email !== undefined) {
        fields.push('email = ?');
        values.push(updates.email);
      }
      
      if (fields.length === 0) {
        return { success: false, error: 'No fields to update' };
      }
      
      values.push(id); // Add id for WHERE clause
      
      const result = db.prepare(`
        UPDATE users SET ${fields.join(', ')} WHERE id = ?
      `).run(...values);
      
      if (result.changes === 0) {
        return { success: false, error: 'User not found' };
      }
      
      console.log('User updated:', id, updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
  },

  delete: function(id) {
    try {
      const result = db.prepare(`
        DELETE FROM users WHERE id = ?
      `).run(id);
      
      if (result.changes === 0) {
        return { success: false, error: 'User not found' };
      }
      
      console.log('User deleted:', id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = Users;
