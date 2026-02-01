const path = require('path');
const Database = require('better-sqlite3');

// Create an in-memory database for isolated testing
let testDb;
let Users;
let GameScores;
let MoodEntries;
let JournalEntries;

// Helper to generate unique IDs
const generateId = () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to create tables in test database (mirrors database.js structure)
function setupTestTables(db) {
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'admin')),
      createdAt TEXT NOT NULL
    )
  `);

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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_game_scores_user_game
    ON game_scores(userId, gameId)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS mood_entries (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      mood TEXT NOT NULL CHECK(mood IN ('great', 'good', 'okay', 'bad', 'terrible')),
      emoji TEXT NOT NULL,
      note TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id),
      UNIQUE(userId, date)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_mood_entries_user
    ON mood_entries(userId)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_journal_entries_user
    ON journal_entries(userId)
  `);
}

// Create data access objects that mirror database.js but use our test db
function createDataAccessObjects(db) {
  const UsersDAO = {
    add: function(id, email, password, role, createdAt) {
      try {
        db.prepare(`
          INSERT INTO users (id, email, password, role, createdAt)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, email, password, role, createdAt);
        return { success: true };
      } catch (error) {
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

  const GameScoresDAO = {
    add: function(id, userId, gameId, score, metadata, completedAt) {
      try {
        db.prepare(`
          INSERT INTO game_scores (id, userId, gameId, score, metadata, completedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, userId, gameId, score, metadata, completedAt);
        return { success: true };
      } catch (error) {
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
        return { success: false, error: error.message };
      }
    }
  };

  const MoodEntriesDAO = {
    add: function(id, userId, date, mood, emoji, note, timestamp) {
      try {
        db.prepare(`
          INSERT INTO mood_entries (id, userId, date, mood, emoji, note, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, userId, date, mood, emoji, note, timestamp);
        return { success: true };
      } catch (error) {
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
        return { success: true, changes: result.changes };
      } catch (error) {
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
        return { success: false, error: error.message };
      }
    },

    delete: function(userId, date) {
      try {
        const result = db.prepare(`
          DELETE FROM mood_entries
          WHERE userId = ? AND date = ?
        `).run(userId, date);
        return { success: true, changes: result.changes };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  };

  const JournalEntriesDAO = {
    add: function(id, userId, title, content, createdAt) {
      try {
        db.prepare(`
          INSERT INTO journal_entries (id, userId, title, content, createdAt)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, userId, title, content, createdAt);
        return { success: true };
      } catch (error) {
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
        return { success: true, changes: result.changes };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    delete: function(id, userId) {
      try {
        const result = db.prepare(`
          DELETE FROM journal_entries
          WHERE id = ? AND userId = ?
        `).run(id, userId);
        return { success: true, changes: result.changes };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  };

  return { UsersDAO, GameScoresDAO, MoodEntriesDAO, JournalEntriesDAO };
}

describe('Database Module - Unit Tests', () => {
  beforeAll(() => {
    // Create in-memory database for testing
    testDb = new Database(':memory:');
    setupTestTables(testDb);
    const daos = createDataAccessObjects(testDb);
    Users = daos.UsersDAO;
    GameScores = daos.GameScoresDAO;
    MoodEntries = daos.MoodEntriesDAO;
    JournalEntries = daos.JournalEntriesDAO;
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
  });

  beforeEach(() => {
    // Clear all tables before each test
    testDb.exec('PRAGMA foreign_keys = OFF');
    testDb.exec('DELETE FROM journal_entries');
    testDb.exec('DELETE FROM mood_entries');
    testDb.exec('DELETE FROM game_scores');
    testDb.exec('DELETE FROM users');
    testDb.exec('PRAGMA foreign_keys = ON');
  });

  describe('Users', () => {
    describe('add', () => {
      it('should add a new user successfully', () => {
        const id = generateId();
        const result = Users.add(id, 'test@my.yorku.ca', 'hashedpassword', 'student', new Date().toISOString());

        expect(result.success).toBe(true);
      });

      it('should fail when adding user with duplicate email', () => {
        const id1 = generateId();
        const id2 = generateId();
        Users.add(id1, 'duplicate@my.yorku.ca', 'password1', 'student', new Date().toISOString());

        const result = Users.add(id2, 'duplicate@my.yorku.ca', 'password2', 'student', new Date().toISOString());

        expect(result.success).toBe(false);
        expect(result.error).toContain('UNIQUE constraint failed');
      });

      it('should fail when adding user with invalid role', () => {
        const id = generateId();
        const result = Users.add(id, 'test@my.yorku.ca', 'password', 'invalid_role', new Date().toISOString());

        expect(result.success).toBe(false);
        expect(result.error).toContain('CHECK constraint failed');
      });

      it('should add admin user successfully', () => {
        const id = generateId();
        const result = Users.add(id, 'admin@my.yorku.ca', 'adminpassword', 'admin', new Date().toISOString());

        expect(result.success).toBe(true);
      });
    });

    describe('getByEmail', () => {
      it('should find user by email (case insensitive)', () => {
        const id = generateId();
        const email = 'Test@My.YorkU.Ca';
        Users.add(id, email, 'password', 'student', new Date().toISOString());

        const result = Users.getByEmail('test@my.yorku.ca');

        expect(result.success).toBe(true);
        expect(result.user.id).toBe(id);
        expect(result.user.email).toBe(email);
      });

      it('should return error for non-existent email', () => {
        const result = Users.getByEmail('nonexistent@my.yorku.ca');

        expect(result.success).toBe(false);
        expect(result.error).toBe('User not found');
      });
    });

    describe('findById', () => {
      it('should find user by id', () => {
        const id = generateId();
        const email = 'findbyid@my.yorku.ca';
        Users.add(id, email, 'password', 'student', new Date().toISOString());

        const result = Users.findById(id);

        expect(result.success).toBe(true);
        expect(result.user.email).toBe(email);
      });

      it('should return error for non-existent id', () => {
        const result = Users.findById('nonexistent_id');

        expect(result.success).toBe(false);
        expect(result.error).toBe('User not found');
      });
    });

    describe('all', () => {
      it('should return empty array when no users', () => {
        const result = Users.all();

        expect(result.success).toBe(true);
        expect(result.users).toEqual([]);
      });

      it('should return all users', () => {
        Users.add(generateId(), 'user1@my.yorku.ca', 'pass1', 'student', new Date().toISOString());
        Users.add(generateId(), 'user2@my.yorku.ca', 'pass2', 'admin', new Date().toISOString());
        Users.add(generateId(), 'user3@my.yorku.ca', 'pass3', 'student', new Date().toISOString());

        const result = Users.all();

        expect(result.success).toBe(true);
        expect(result.users).toHaveLength(3);
      });
    });
  });

  describe('GameScores', () => {
    let testUserId;

    beforeEach(() => {
      testUserId = generateId();
      Users.add(testUserId, 'gamer@my.yorku.ca', 'password', 'student', new Date().toISOString());
    });

    describe('add', () => {
      it('should add a new game score successfully', () => {
        const scoreId = generateId();
        const result = GameScores.add(scoreId, testUserId, 'brick-breaker', 100, null, new Date().toISOString());

        expect(result.success).toBe(true);
      });

      it('should add score with metadata', () => {
        const scoreId = generateId();
        const metadata = JSON.stringify({ level: 5, bonuses: ['speed', 'multiball'] });
        const result = GameScores.add(scoreId, testUserId, 'brick-breaker', 500, metadata, new Date().toISOString());

        expect(result.success).toBe(true);
      });

      it('should fail when adding score for non-existent user (foreign key)', () => {
        const scoreId = generateId();
        const result = GameScores.add(scoreId, 'nonexistent_user', 'brick-breaker', 100, null, new Date().toISOString());

        expect(result.success).toBe(false);
        expect(result.error).toContain('FOREIGN KEY constraint failed');
      });
    });

    describe('getUserScores', () => {
      it('should return empty array when no scores', () => {
        const result = GameScores.getUserScores(testUserId, 'brick-breaker');

        expect(result.success).toBe(true);
        expect(result.scores).toEqual([]);
      });

      it('should return scores ordered by score DESC', () => {
        GameScores.add(generateId(), testUserId, 'brick-breaker', 100, null, '2024-01-01T10:00:00Z');
        GameScores.add(generateId(), testUserId, 'brick-breaker', 300, null, '2024-01-01T11:00:00Z');
        GameScores.add(generateId(), testUserId, 'brick-breaker', 200, null, '2024-01-01T12:00:00Z');

        const result = GameScores.getUserScores(testUserId, 'brick-breaker');

        expect(result.success).toBe(true);
        expect(result.scores).toHaveLength(3);
        expect(result.scores[0].score).toBe(300);
        expect(result.scores[1].score).toBe(200);
        expect(result.scores[2].score).toBe(100);
      });

      it('should only return scores for specified game', () => {
        GameScores.add(generateId(), testUserId, 'brick-breaker', 100, null, new Date().toISOString());
        GameScores.add(generateId(), testUserId, 'memory-game', 200, null, new Date().toISOString());

        const result = GameScores.getUserScores(testUserId, 'brick-breaker');

        expect(result.success).toBe(true);
        expect(result.scores).toHaveLength(1);
        expect(result.scores[0].gameId).toBe('brick-breaker');
      });
    });

    describe('getTopScores', () => {
      it('should return top scores across all users', () => {
        const user2Id = generateId();
        Users.add(user2Id, 'gamer2@my.yorku.ca', 'password', 'student', new Date().toISOString());

        GameScores.add(generateId(), testUserId, 'brick-breaker', 100, null, '2024-01-01T10:00:00Z');
        GameScores.add(generateId(), user2Id, 'brick-breaker', 300, null, '2024-01-01T11:00:00Z');
        GameScores.add(generateId(), testUserId, 'brick-breaker', 200, null, '2024-01-01T12:00:00Z');

        const result = GameScores.getTopScores('brick-breaker', 10);

        expect(result.success).toBe(true);
        expect(result.scores).toHaveLength(3);
        expect(result.scores[0].score).toBe(300);
        expect(result.scores[0].email).toBe('gamer2@my.yorku.ca');
      });

      it('should respect limit parameter', () => {
        GameScores.add(generateId(), testUserId, 'brick-breaker', 100, null, new Date().toISOString());
        GameScores.add(generateId(), testUserId, 'brick-breaker', 200, null, new Date().toISOString());
        GameScores.add(generateId(), testUserId, 'brick-breaker', 300, null, new Date().toISOString());

        const result = GameScores.getTopScores('brick-breaker', 2);

        expect(result.success).toBe(true);
        expect(result.scores).toHaveLength(2);
      });
    });

    describe('getUserBestScore', () => {
      it('should return best score for user and game', () => {
        GameScores.add(generateId(), testUserId, 'brick-breaker', 100, null, '2024-01-01T10:00:00Z');
        GameScores.add(generateId(), testUserId, 'brick-breaker', 300, null, '2024-01-01T11:00:00Z');
        GameScores.add(generateId(), testUserId, 'brick-breaker', 200, null, '2024-01-01T12:00:00Z');

        const result = GameScores.getUserBestScore(testUserId, 'brick-breaker');

        expect(result.success).toBe(true);
        expect(result.score.score).toBe(300);
      });

      it('should return error when no scores found', () => {
        const result = GameScores.getUserBestScore(testUserId, 'nonexistent-game');

        expect(result.success).toBe(false);
        expect(result.error).toBe('No scores found');
      });
    });
  });

  describe('MoodEntries', () => {
    let testUserId;

    beforeEach(() => {
      testUserId = generateId();
      Users.add(testUserId, 'mood@my.yorku.ca', 'password', 'student', new Date().toISOString());
    });

    describe('add', () => {
      it('should add a new mood entry successfully', () => {
        const entryId = generateId();
        const result = MoodEntries.add(entryId, testUserId, '2024-01-15', 'good', '😊', 'Feeling good today', new Date().toISOString());

        expect(result.success).toBe(true);
      });

      it('should fail with invalid mood value', () => {
        const entryId = generateId();
        const result = MoodEntries.add(entryId, testUserId, '2024-01-15', 'invalid_mood', '😊', 'Note', new Date().toISOString());

        expect(result.success).toBe(false);
        expect(result.error).toContain('CHECK constraint failed');
      });

      it('should accept all valid mood values', () => {
        const moods = ['great', 'good', 'okay', 'bad', 'terrible'];

        moods.forEach((mood, index) => {
          const result = MoodEntries.add(generateId(), testUserId, `2024-01-${10 + index}`, mood, '😊', 'Note', new Date().toISOString());
          expect(result.success).toBe(true);
        });
      });

      it('should fail when adding duplicate entry for same user and date', () => {
        MoodEntries.add(generateId(), testUserId, '2024-01-15', 'good', '😊', 'First entry', new Date().toISOString());

        const result = MoodEntries.add(generateId(), testUserId, '2024-01-15', 'great', '🎉', 'Duplicate entry', new Date().toISOString());

        expect(result.success).toBe(false);
        expect(result.error).toContain('UNIQUE constraint failed');
      });
    });

    describe('update', () => {
      it('should update existing mood entry', () => {
        MoodEntries.add(generateId(), testUserId, '2024-01-15', 'good', '😊', 'Original note', '2024-01-15T10:00:00Z');

        const result = MoodEntries.update(testUserId, '2024-01-15', 'great', '🎉', 'Updated note', '2024-01-15T15:00:00Z');

        expect(result.success).toBe(true);
        expect(result.changes).toBe(1);

        const entry = MoodEntries.getByUserAndDate(testUserId, '2024-01-15');
        expect(entry.entry.mood).toBe('great');
        expect(entry.entry.note).toBe('Updated note');
      });

      it('should return 0 changes when entry does not exist', () => {
        const result = MoodEntries.update(testUserId, '2024-01-15', 'good', '😊', 'Note', new Date().toISOString());

        expect(result.success).toBe(true);
        expect(result.changes).toBe(0);
      });
    });

    describe('getUserEntries', () => {
      it('should return entries ordered by date DESC', () => {
        MoodEntries.add(generateId(), testUserId, '2024-01-10', 'good', '😊', 'Note 1', new Date().toISOString());
        MoodEntries.add(generateId(), testUserId, '2024-01-15', 'great', '🎉', 'Note 2', new Date().toISOString());
        MoodEntries.add(generateId(), testUserId, '2024-01-12', 'okay', '😐', 'Note 3', new Date().toISOString());

        const result = MoodEntries.getUserEntries(testUserId);

        expect(result.success).toBe(true);
        expect(result.entries).toHaveLength(3);
        expect(result.entries[0].date).toBe('2024-01-15');
        expect(result.entries[1].date).toBe('2024-01-12');
        expect(result.entries[2].date).toBe('2024-01-10');
      });

      it('should respect limit parameter', () => {
        MoodEntries.add(generateId(), testUserId, '2024-01-10', 'good', '😊', 'Note 1', new Date().toISOString());
        MoodEntries.add(generateId(), testUserId, '2024-01-11', 'great', '🎉', 'Note 2', new Date().toISOString());
        MoodEntries.add(generateId(), testUserId, '2024-01-12', 'okay', '😐', 'Note 3', new Date().toISOString());

        const result = MoodEntries.getUserEntries(testUserId, 2);

        expect(result.success).toBe(true);
        expect(result.entries).toHaveLength(2);
      });

      it('should use default limit of 30', () => {
        // Add 35 entries
        for (let i = 1; i <= 35; i++) {
          const day = i.toString().padStart(2, '0');
          MoodEntries.add(generateId(), testUserId, `2024-01-${day}`, 'good', '😊', `Note ${i}`, new Date().toISOString());
        }

        const result = MoodEntries.getUserEntries(testUserId);

        expect(result.success).toBe(true);
        expect(result.entries).toHaveLength(30);
      });
    });

    describe('getByUserAndDate', () => {
      it('should find entry by user and date', () => {
        MoodEntries.add(generateId(), testUserId, '2024-01-15', 'good', '😊', 'Test note', new Date().toISOString());

        const result = MoodEntries.getByUserAndDate(testUserId, '2024-01-15');

        expect(result.success).toBe(true);
        expect(result.entry.mood).toBe('good');
        expect(result.entry.note).toBe('Test note');
      });

      it('should return error when entry not found', () => {
        const result = MoodEntries.getByUserAndDate(testUserId, '2024-01-15');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Entry not found');
      });
    });

    describe('delete', () => {
      it('should delete existing entry', () => {
        MoodEntries.add(generateId(), testUserId, '2024-01-15', 'good', '😊', 'Note', new Date().toISOString());

        const result = MoodEntries.delete(testUserId, '2024-01-15');

        expect(result.success).toBe(true);
        expect(result.changes).toBe(1);

        const check = MoodEntries.getByUserAndDate(testUserId, '2024-01-15');
        expect(check.success).toBe(false);
      });

      it('should return 0 changes when entry does not exist', () => {
        const result = MoodEntries.delete(testUserId, '2024-01-15');

        expect(result.success).toBe(true);
        expect(result.changes).toBe(0);
      });
    });
  });

  describe('JournalEntries', () => {
    let testUserId;

    beforeEach(() => {
      testUserId = generateId();
      Users.add(testUserId, 'journal@my.yorku.ca', 'password', 'student', new Date().toISOString());
    });

    describe('add', () => {
      it('should add a new journal entry successfully', () => {
        const entryId = generateId();
        const result = JournalEntries.add(entryId, testUserId, 'My First Entry', 'This is my journal content.', new Date().toISOString());

        expect(result.success).toBe(true);
      });

      it('should fail when adding entry for non-existent user', () => {
        const entryId = generateId();
        const result = JournalEntries.add(entryId, 'nonexistent_user', 'Title', 'Content', new Date().toISOString());

        expect(result.success).toBe(false);
        expect(result.error).toContain('FOREIGN KEY constraint failed');
      });
    });

    describe('getUserEntries', () => {
      it('should return entries ordered by createdAt DESC', () => {
        JournalEntries.add(generateId(), testUserId, 'Entry 1', 'Content 1', '2024-01-10T10:00:00Z');
        JournalEntries.add(generateId(), testUserId, 'Entry 2', 'Content 2', '2024-01-15T10:00:00Z');
        JournalEntries.add(generateId(), testUserId, 'Entry 3', 'Content 3', '2024-01-12T10:00:00Z');

        const result = JournalEntries.getUserEntries(testUserId);

        expect(result.success).toBe(true);
        expect(result.entries).toHaveLength(3);
        expect(result.entries[0].title).toBe('Entry 2');
        expect(result.entries[1].title).toBe('Entry 3');
        expect(result.entries[2].title).toBe('Entry 1');
      });

      it('should respect limit parameter', () => {
        JournalEntries.add(generateId(), testUserId, 'Entry 1', 'Content 1', new Date().toISOString());
        JournalEntries.add(generateId(), testUserId, 'Entry 2', 'Content 2', new Date().toISOString());
        JournalEntries.add(generateId(), testUserId, 'Entry 3', 'Content 3', new Date().toISOString());

        const result = JournalEntries.getUserEntries(testUserId, 2);

        expect(result.success).toBe(true);
        expect(result.entries).toHaveLength(2);
      });

      it('should use default limit of 100', () => {
        // Add 105 entries
        for (let i = 1; i <= 105; i++) {
          JournalEntries.add(generateId(), testUserId, `Entry ${i}`, `Content ${i}`, new Date().toISOString());
        }

        const result = JournalEntries.getUserEntries(testUserId);

        expect(result.success).toBe(true);
        expect(result.entries).toHaveLength(100);
      });
    });

    describe('getById', () => {
      it('should find entry by id', () => {
        const entryId = generateId();
        JournalEntries.add(entryId, testUserId, 'Test Title', 'Test Content', new Date().toISOString());

        const result = JournalEntries.getById(entryId);

        expect(result.success).toBe(true);
        expect(result.entry.title).toBe('Test Title');
        expect(result.entry.content).toBe('Test Content');
      });

      it('should return error when entry not found', () => {
        const result = JournalEntries.getById('nonexistent_id');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Entry not found');
      });
    });

    describe('update', () => {
      it('should update existing entry', () => {
        const entryId = generateId();
        JournalEntries.add(entryId, testUserId, 'Original Title', 'Original Content', new Date().toISOString());

        const result = JournalEntries.update(entryId, testUserId, 'Updated Title', 'Updated Content');

        expect(result.success).toBe(true);
        expect(result.changes).toBe(1);

        const entry = JournalEntries.getById(entryId);
        expect(entry.entry.title).toBe('Updated Title');
        expect(entry.entry.content).toBe('Updated Content');
      });

      it('should not update entry belonging to different user', () => {
        const entryId = generateId();
        const otherUserId = generateId();
        Users.add(otherUserId, 'other@my.yorku.ca', 'password', 'student', new Date().toISOString());
        JournalEntries.add(entryId, testUserId, 'Original Title', 'Original Content', new Date().toISOString());

        const result = JournalEntries.update(entryId, otherUserId, 'Hacked Title', 'Hacked Content');

        expect(result.success).toBe(true);
        expect(result.changes).toBe(0);

        const entry = JournalEntries.getById(entryId);
        expect(entry.entry.title).toBe('Original Title');
      });

      it('should return 0 changes when entry does not exist', () => {
        const result = JournalEntries.update('nonexistent_id', testUserId, 'Title', 'Content');

        expect(result.success).toBe(true);
        expect(result.changes).toBe(0);
      });
    });

    describe('delete', () => {
      it('should delete existing entry', () => {
        const entryId = generateId();
        JournalEntries.add(entryId, testUserId, 'To Be Deleted', 'Content', new Date().toISOString());

        const result = JournalEntries.delete(entryId, testUserId);

        expect(result.success).toBe(true);
        expect(result.changes).toBe(1);

        const check = JournalEntries.getById(entryId);
        expect(check.success).toBe(false);
      });

      it('should not delete entry belonging to different user', () => {
        const entryId = generateId();
        const otherUserId = generateId();
        Users.add(otherUserId, 'other@my.yorku.ca', 'password', 'student', new Date().toISOString());
        JournalEntries.add(entryId, testUserId, 'Protected Entry', 'Content', new Date().toISOString());

        const result = JournalEntries.delete(entryId, otherUserId);

        expect(result.success).toBe(true);
        expect(result.changes).toBe(0);

        const check = JournalEntries.getById(entryId);
        expect(check.success).toBe(true);
      });

      it('should return 0 changes when entry does not exist', () => {
        const result = JournalEntries.delete('nonexistent_id', testUserId);

        expect(result.success).toBe(true);
        expect(result.changes).toBe(0);
      });
    });
  });

  describe('Database Schema Validation', () => {
    it('should have foreign keys enabled', () => {
      const result = testDb.pragma('foreign_keys');
      expect(result[0].foreign_keys).toBe(1);
    });

    it('should have users table with correct columns', () => {
      const columns = testDb.pragma('table_info(users)');
      const columnNames = columns.map(c => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('password');
      expect(columnNames).toContain('role');
      expect(columnNames).toContain('createdAt');
    });

    it('should have game_scores table with correct columns', () => {
      const columns = testDb.pragma('table_info(game_scores)');
      const columnNames = columns.map(c => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('gameId');
      expect(columnNames).toContain('score');
      expect(columnNames).toContain('metadata');
      expect(columnNames).toContain('completedAt');
    });

    it('should have mood_entries table with correct columns', () => {
      const columns = testDb.pragma('table_info(mood_entries)');
      const columnNames = columns.map(c => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('date');
      expect(columnNames).toContain('mood');
      expect(columnNames).toContain('emoji');
      expect(columnNames).toContain('note');
      expect(columnNames).toContain('timestamp');
    });

    it('should have journal_entries table with correct columns', () => {
      const columns = testDb.pragma('table_info(journal_entries)');
      const columnNames = columns.map(c => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('title');
      expect(columnNames).toContain('content');
      expect(columnNames).toContain('createdAt');
    });

    it('should have indexes for performance', () => {
      const indexes = testDb.prepare("SELECT name FROM sqlite_master WHERE type='index'").all();
      const indexNames = indexes.map(i => i.name);

      expect(indexNames).toContain('idx_game_scores_user_game');
      expect(indexNames).toContain('idx_mood_entries_user');
      expect(indexNames).toContain('idx_journal_entries_user');
    });
  });
});
