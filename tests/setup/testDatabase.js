const path = require('path');
const bcrypt = require('bcrypt');

// Set environment variables before requiring db
process.env.NODE_ENV = 'test';
process.env.TEST_DB_PATH = path.join(__dirname, '../../utils/db/test.db');

// Clear require cache for db module to ensure fresh instance with test path
delete require.cache[require.resolve('../../utils/db/db')];

// Now require db - this will use TEST_DB_PATH
const db = require('../../utils/db/db');

/**
 * Clear all data from the test database (uses the same db instance as server)
 */
function clearTestDatabase() {
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('DELETE FROM habit_completions');
  db.exec('DELETE FROM habits');
  db.exec('DELETE FROM journal_entries');
  db.exec('DELETE FROM mood_entries');
  db.exec('DELETE FROM game_scores');
  db.exec('DELETE FROM users');
  db.exec('PRAGMA foreign_keys = ON');
}

/**
 * Create a test user directly in test database
 */
async function createTestUser(overrides = {}) {
  const plainPassword = overrides.password || 'Test123!@#';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const user = {
    id: overrides.id || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: overrides.email || `test${Date.now()}@my.yorku.ca`,
    password: hashedPassword,
    role: overrides.role || 'student',
    createdAt: overrides.createdAt || new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO users (id, email, password, role, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(user.id, user.email, user.password, user.role, user.createdAt);

  return { ...user, plainPassword };
}

/**
 * Create a test admin user
 */
async function createTestAdmin(overrides = {}) {
  return createTestUser({ ...overrides, role: 'admin' });
}

/**
 * Get the database instance (for advanced operations)
 */
function getTestDatabase() {
  return db;
}

module.exports = {
  clearTestDatabase,
  createTestUser,
  createTestAdmin,
  getTestDatabase
};
