const { clearTestDatabase, createTestUser, getTestDatabase } = require('../setup/testDatabase');
const MoodEntries = require('../../utils/db/MoodEntries');

describe('MoodEntries Module - Unit Tests', () => {
  let testUser;
  let db;

  beforeAll(() => {
    db = getTestDatabase();
  });

  beforeEach(async () => {
    clearTestDatabase();
    testUser = await createTestUser({
      email: 'mood@my.yorku.ca',
      password: 'Test123!@#'
    });
  });

  describe('add', () => {
    it('should add a new mood entry successfully', () => {
      const entryId = `mood_${Date.now()}`;
      const date = '2024-01-15';
      const timestamp = new Date().toISOString();

      const result = MoodEntries.add(
        entryId,
        testUser.id,
        date,
        'great',
        '😊',
        'Feeling great today!',
        timestamp
      );

      expect(result.success).toBe(true);

      // Verify the entry was added
      const entry = db.prepare('SELECT * FROM mood_entries WHERE id = ?').get(entryId);
      expect(entry).toBeDefined();
      expect(entry.userId).toBe(testUser.id);
      expect(entry.date).toBe(date);
      expect(entry.mood).toBe('great');
      expect(entry.emoji).toBe('😊');
      expect(entry.note).toBe('Feeling great today!');
    });

    it('should add mood entry with null note', () => {
      const entryId = `mood_${Date.now()}`;
      const date = '2024-01-15';
      const timestamp = new Date().toISOString();

      const result = MoodEntries.add(
        entryId,
        testUser.id,
        date,
        'okay',
        '😐',
        null,
        timestamp
      );

      expect(result.success).toBe(true);

      const entry = db.prepare('SELECT * FROM mood_entries WHERE id = ?').get(entryId);
      expect(entry.note).toBeNull();
    });

    it('should fail when adding duplicate entry with same id', () => {
      const entryId = `mood_${Date.now()}`;
      const date = '2024-01-15';
      const timestamp = new Date().toISOString();

      MoodEntries.add(entryId, testUser.id, date, 'great', '😊', 'First entry', timestamp);
      const result = MoodEntries.add(entryId, testUser.id, '2024-01-16', 'bad', '😢', 'Duplicate', timestamp);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when adding entry with invalid userId (foreign key)', () => {
      const entryId = `mood_${Date.now()}`;
      const date = '2024-01-15';
      const timestamp = new Date().toISOString();

      const result = MoodEntries.add(
        entryId,
        'nonexistent_user_id',
        date,
        'good',
        '😊',
        'Test note',
        timestamp
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when adding entry with invalid mood value', () => {
      const entryId = `mood_${Date.now()}`;
      const date = '2024-01-15';
      const timestamp = new Date().toISOString();

      const result = MoodEntries.add(
        entryId,
        testUser.id,
        date,
        'invalid_mood',
        '😊',
        'Test note',
        timestamp
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should accept all valid mood values', () => {
      const timestamp = new Date().toISOString();
      const validMoods = ['great', 'good', 'okay', 'bad', 'terrible'];

      validMoods.forEach((mood, index) => {
        const result = MoodEntries.add(
          `mood_${Date.now()}_${index}`,
          testUser.id,
          `2024-01-${String(index + 1).padStart(2, '0')}`,
          mood,
          '😊',
          `Testing ${mood}`,
          timestamp
        );
        expect(result.success).toBe(true);
      });
    });
  });

  describe('update', () => {
    it('should update an existing mood entry', () => {
      const entryId = `mood_${Date.now()}`;
      const date = '2024-01-15';
      const timestamp = new Date().toISOString();

      MoodEntries.add(entryId, testUser.id, date, 'great', '😊', 'Original note', timestamp);

      const newTimestamp = new Date().toISOString();
      const result = MoodEntries.update(
        testUser.id,
        date,
        'bad',
        '😢',
        'Updated note',
        newTimestamp
      );

      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);

      const entry = db.prepare('SELECT * FROM mood_entries WHERE id = ?').get(entryId);
      expect(entry.mood).toBe('bad');
      expect(entry.emoji).toBe('😢');
      expect(entry.note).toBe('Updated note');
    });

    it('should return 0 changes when entry does not exist', () => {
      const result = MoodEntries.update(
        testUser.id,
        '2024-01-01',
        'good',
        '😊',
        'Note',
        new Date().toISOString()
      );

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);
    });

    it('should not update entries for different user', () => {
      const entryId = `mood_${Date.now()}`;
      const date = '2024-01-15';
      const timestamp = new Date().toISOString();

      MoodEntries.add(entryId, testUser.id, date, 'great', '😊', 'Original note', timestamp);

      const result = MoodEntries.update(
        'different_user_id',
        date,
        'bad',
        '😢',
        'Updated note',
        new Date().toISOString()
      );

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);

      // Verify original entry unchanged
      const entry = db.prepare('SELECT * FROM mood_entries WHERE id = ?').get(entryId);
      expect(entry.mood).toBe('great');
    });
  });

  describe('getUserEntries', () => {
    it('should return user mood entries ordered by date descending', () => {
      const timestamp = new Date().toISOString();

      MoodEntries.add(`mood_1`, testUser.id, '2024-01-10', 'great', '😊', 'Day 1', timestamp);
      MoodEntries.add(`mood_2`, testUser.id, '2024-01-15', 'okay', '😐', 'Day 2', timestamp);
      MoodEntries.add(`mood_3`, testUser.id, '2024-01-12', 'bad', '😢', 'Day 3', timestamp);

      const result = MoodEntries.getUserEntries(testUser.id);

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].date).toBe('2024-01-15');
      expect(result.entries[1].date).toBe('2024-01-12');
      expect(result.entries[2].date).toBe('2024-01-10');
    });

    it('should return empty array when user has no entries', () => {
      const result = MoodEntries.getUserEntries(testUser.id);

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(0);
    });

    it('should respect the limit parameter', () => {
      const timestamp = new Date().toISOString();

      for (let i = 1; i <= 10; i++) {
        const date = `2024-01-${String(i).padStart(2, '0')}`;
        MoodEntries.add(`mood_${i}`, testUser.id, date, 'good', '😊', `Day ${i}`, timestamp);
      }

      const result = MoodEntries.getUserEntries(testUser.id, 5);

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(5);
    });

    it('should use default limit of 30', () => {
      const timestamp = new Date().toISOString();

      for (let i = 1; i <= 35; i++) {
        const month = Math.ceil(i / 28);
        const day = ((i - 1) % 28) + 1;
        const date = `2024-0${month}-${String(day).padStart(2, '0')}`;
        MoodEntries.add(`mood_${i}`, testUser.id, date, 'good', '😊', `Day ${i}`, timestamp);
      }

      const result = MoodEntries.getUserEntries(testUser.id);

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(30);
    });

    it('should only return entries for the specified user', async () => {
      const otherUser = await createTestUser({
        email: 'other@my.yorku.ca',
        password: 'Test123!@#'
      });
      const timestamp = new Date().toISOString();

      MoodEntries.add(`mood_1`, testUser.id, '2024-01-10', 'great', '😊', 'User 1', timestamp);
      MoodEntries.add(`mood_2`, otherUser.id, '2024-01-11', 'bad', '😢', 'User 2', timestamp);

      const result = MoodEntries.getUserEntries(testUser.id);

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].userId).toBe(testUser.id);
    });
  });

  describe('getByUserAndDate', () => {
    it('should return entry for user and date', () => {
      const entryId = `mood_${Date.now()}`;
      const date = '2024-01-15';
      const timestamp = new Date().toISOString();

      MoodEntries.add(entryId, testUser.id, date, 'great', '😊', 'Test note', timestamp);

      const result = MoodEntries.getByUserAndDate(testUser.id, date);

      expect(result.success).toBe(true);
      expect(result.entry).toBeDefined();
      expect(result.entry.id).toBe(entryId);
      expect(result.entry.mood).toBe('great');
      expect(result.entry.emoji).toBe('😊');
      expect(result.entry.note).toBe('Test note');
    });

    it('should return error when entry not found', () => {
      const result = MoodEntries.getByUserAndDate(testUser.id, '2024-01-01');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Entry not found');
    });

    it('should not return entry for different user', async () => {
      const otherUser = await createTestUser({
        email: 'other2@my.yorku.ca',
        password: 'Test123!@#'
      });
      const date = '2024-01-15';
      const timestamp = new Date().toISOString();

      MoodEntries.add(`mood_1`, testUser.id, date, 'good', '😊', 'Test', timestamp);

      const result = MoodEntries.getByUserAndDate(otherUser.id, date);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Entry not found');
    });

    it('should not return entry for different date', () => {
      const date = '2024-01-15';
      const timestamp = new Date().toISOString();

      MoodEntries.add(`mood_1`, testUser.id, date, 'good', '😊', 'Test', timestamp);

      const result = MoodEntries.getByUserAndDate(testUser.id, '2024-01-16');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Entry not found');
    });
  });

  describe('delete', () => {
    it('should delete an existing mood entry', () => {
      const entryId = `mood_${Date.now()}`;
      const date = '2024-01-15';
      const timestamp = new Date().toISOString();

      MoodEntries.add(entryId, testUser.id, date, 'great', '😊', 'Test note', timestamp);

      const result = MoodEntries.delete(testUser.id, date);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);

      // Verify deletion
      const entry = db.prepare('SELECT * FROM mood_entries WHERE id = ?').get(entryId);
      expect(entry).toBeUndefined();
    });

    it('should return 0 changes when entry does not exist', () => {
      const result = MoodEntries.delete(testUser.id, '2024-01-01');

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);
    });

    it('should not delete entries for different user', async () => {
      const entryId = `mood_${Date.now()}`;
      const date = '2024-01-15';
      const timestamp = new Date().toISOString();

      // First add the entry for testUser
      const addResult = MoodEntries.add(entryId, testUser.id, date, 'great', '😊', 'Test note', timestamp);
      expect(addResult.success).toBe(true);

      // Create another user
      const otherUser = await createTestUser({
        email: 'other3@my.yorku.ca',
        password: 'Test123!@#'
      });

      // Try to delete using the other user's ID
      const result = MoodEntries.delete(otherUser.id, date);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);

      // Verify entry still exists
      const entry = db.prepare('SELECT * FROM mood_entries WHERE id = ?').get(entryId);
      expect(entry).toBeDefined();
    });

    it('should only delete the specific date entry', () => {
      const timestamp = new Date().toISOString();

      MoodEntries.add(`mood_1`, testUser.id, '2024-01-15', 'great', '😊', 'Day 1', timestamp);
      MoodEntries.add(`mood_2`, testUser.id, '2024-01-16', 'bad', '😢', 'Day 2', timestamp);

      const result = MoodEntries.delete(testUser.id, '2024-01-15');

      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);

      // Verify only one entry remains
      const entries = MoodEntries.getUserEntries(testUser.id);
      expect(entries.entries).toHaveLength(1);
      expect(entries.entries[0].date).toBe('2024-01-16');
    });
  });
});
