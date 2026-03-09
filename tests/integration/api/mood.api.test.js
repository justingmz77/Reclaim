const request = require('supertest');
const { clearTestDatabase, createTestUser } = require('../../setup/testDatabase');
const { createAuthenticatedAgent, testDataGenerators } = require('../../setup/testHelpers');

// Import app after testDatabase sets up environment
const app = require('../../../server');

describe('Mood Entries API', () => {
  let testUser;
  let authAgent;

  beforeEach(async () => {
    clearTestDatabase();
    testUser = await createTestUser({
      email: 'mood@my.yorku.ca',
      password: 'Test123!@#'
    });
    authAgent = await createAuthenticatedAgent(app, testUser);
  });

  describe('POST /api/mood-entries', () => {
    it('should create a new mood entry', async () => {
      const moodData = testDataGenerators.moodEntry();

      const response = await authAgent
        .post('/api/mood-entries')
        .send(moodData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mood entry saved successfully');
      expect(response.body.entry.date).toBe(moodData.date);
      expect(response.body.entry.mood).toBe(moodData.mood);
      expect(response.body.entry.emoji).toBe(moodData.emoji);
      expect(response.body.entry.note).toBe(moodData.note);
    });

    it('should update an existing mood entry for the same date', async () => {
      const moodData = testDataGenerators.moodEntry({ mood: 'good' });

      // Create initial entry
      await authAgent
        .post('/api/mood-entries')
        .send(moodData);

      // Update entry for the same date
      const updatedData = { ...moodData, mood: 'great', note: 'Updated note' };
      const response = await authAgent
        .post('/api/mood-entries')
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mood entry updated successfully');
      expect(response.body.entry.mood).toBe('great');
      expect(response.body.entry.note).toBe('Updated note');
    });

    it('should reject mood entry without date', async () => {
      const response = await authAgent
        .post('/api/mood-entries')
        .send({ mood: 'good', emoji: '😊' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('date, mood, and emoji are required');
    });

    it('should reject mood entry without mood', async () => {
      const response = await authAgent
        .post('/api/mood-entries')
        .send({ date: '2025-01-15', emoji: '😊' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('date, mood, and emoji are required');
    });

    it('should reject mood entry without emoji', async () => {
      const response = await authAgent
        .post('/api/mood-entries')
        .send({ date: '2025-01-15', mood: 'good' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('date, mood, and emoji are required');
    });

    it('should reject invalid mood value', async () => {
      const response = await authAgent
        .post('/api/mood-entries')
        .send({ date: '2025-01-15', mood: 'invalid', emoji: '😊' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid mood value');
    });

    it('should accept all valid mood values', async () => {
      const validMoods = ['great', 'good', 'okay', 'bad', 'terrible'];

      for (const mood of validMoods) {
        clearTestDatabase();
        testUser = await createTestUser({
          email: `mood-${mood}@my.yorku.ca`,
          password: 'Test123!@#'
        });
        authAgent = await createAuthenticatedAgent(app, testUser);

        const response = await authAgent
          .post('/api/mood-entries')
          .send({ date: '2025-01-15', mood, emoji: '😊' });

        expect(response.status).toBe(200);
        expect(response.body.entry.mood).toBe(mood);
      }
    });

    it('should create mood entry without note', async () => {
      const response = await authAgent
        .post('/api/mood-entries')
        .send({ date: '2025-01-15', mood: 'good', emoji: '😊' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entry.note).toBe('');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/mood-entries')
        .send(testDataGenerators.moodEntry());

      // Should redirect to login or return 401
      expect([302, 401]).toContain(response.status);
    });
  });

  describe('GET /api/mood-entries', () => {
    it('should return user mood entries', async () => {
      // Create a mood entry first
      await authAgent
        .post('/api/mood-entries')
        .send(testDataGenerators.moodEntry({ date: '2025-01-15', mood: 'great' }));

      const response = await authAgent.get('/api/mood-entries');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0].mood).toBe('great');
    });

    it('should return empty array when no mood entries exist', async () => {
      const response = await authAgent.get('/api/mood-entries');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entries).toHaveLength(0);
    });

    it('should return multiple mood entries', async () => {
      // Create multiple mood entries
      await authAgent
        .post('/api/mood-entries')
        .send(testDataGenerators.moodEntry({ date: '2025-01-15', mood: 'good' }));
      await authAgent
        .post('/api/mood-entries')
        .send(testDataGenerators.moodEntry({ date: '2025-01-16', mood: 'great' }));
      await authAgent
        .post('/api/mood-entries')
        .send(testDataGenerators.moodEntry({ date: '2025-01-17', mood: 'okay' }));

      const response = await authAgent.get('/api/mood-entries');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entries).toHaveLength(3);
    });

    it('should respect the limit query parameter', async () => {
      // Create multiple mood entries
      for (let i = 1; i <= 5; i++) {
        await authAgent
          .post('/api/mood-entries')
          .send(testDataGenerators.moodEntry({ date: `2025-01-${String(i).padStart(2, '0')}` }));
      }

      const response = await authAgent.get('/api/mood-entries?limit=3');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entries).toHaveLength(3);
    });

    it('should not return other users mood entries', async () => {
      // Create mood entry with first user
      await authAgent
        .post('/api/mood-entries')
        .send(testDataGenerators.moodEntry({ date: '2025-01-15' }));

      // Create second user
      const otherUser = await createTestUser({
        email: 'other@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);

      // Other user should not see first user's entries
      const response = await otherAgent.get('/api/mood-entries');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entries).toHaveLength(0);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/mood-entries');

      // Should redirect to login or return 401
      expect([302, 401]).toContain(response.status);
    });
  });

  describe('GET /api/mood-entries/:date', () => {
    it('should return a specific mood entry by date', async () => {
      const moodData = testDataGenerators.moodEntry({ date: '2025-01-15', mood: 'great' });

      // Create the entry
      await authAgent
        .post('/api/mood-entries')
        .send(moodData);

      const response = await authAgent.get('/api/mood-entries/2025-01-15');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entry.date).toBe('2025-01-15');
      expect(response.body.entry.mood).toBe('great');
    });

    it('should return 404 for non-existent date', async () => {
      const response = await authAgent.get('/api/mood-entries/2025-01-99');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Entry not found');
    });

    it('should not return other users mood entry', async () => {
      // Create mood entry with first user
      await authAgent
        .post('/api/mood-entries')
        .send(testDataGenerators.moodEntry({ date: '2025-01-15' }));

      // Create second user
      const otherUser = await createTestUser({
        email: 'other@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);

      // Other user should not be able to access entry
      const response = await otherAgent.get('/api/mood-entries/2025-01-15');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Entry not found');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/mood-entries/2025-01-15');

      // Should redirect to login or return 401
      expect([302, 401]).toContain(response.status);
    });
  });

  describe('DELETE /api/mood-entries/:date', () => {
    it('should delete a mood entry', async () => {
      // Create a mood entry first
      await authAgent
        .post('/api/mood-entries')
        .send(testDataGenerators.moodEntry({ date: '2025-01-15' }));

      const response = await authAgent.delete('/api/mood-entries/2025-01-15');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mood entry deleted successfully');

      // Verify deletion
      const getResponse = await authAgent.get('/api/mood-entries');
      expect(getResponse.body.entries).toHaveLength(0);
    });

    it('should return 404 for non-existent entry', async () => {
      const response = await authAgent.delete('/api/mood-entries/2025-01-99');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Entry not found');
    });

    it('should not allow deleting other users mood entry', async () => {
      // Create mood entry with first user
      await authAgent
        .post('/api/mood-entries')
        .send(testDataGenerators.moodEntry({ date: '2025-01-15' }));

      // Create second user
      const otherUser = await createTestUser({
        email: 'other@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);

      // Try to delete with second user
      const response = await otherAgent.delete('/api/mood-entries/2025-01-15');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Entry not found');

      // Verify original entry still exists
      const getResponse = await authAgent.get('/api/mood-entries/2025-01-15');
      expect(getResponse.status).toBe(200);
    });

    it('should require authentication', async () => {
      const response = await request(app).delete('/api/mood-entries/2025-01-15');

      // Should redirect to login or return 401
      expect([302, 401]).toContain(response.status);
    });
  });

  describe('Mood entry data integrity', () => {
    it('should store and retrieve note correctly', async () => {
      const longNote = 'This is a longer note with special characters: !@#$%^&*() and numbers 12345';

      await authAgent
        .post('/api/mood-entries')
        .send(testDataGenerators.moodEntry({ date: '2025-01-15', note: longNote }));

      const response = await authAgent.get('/api/mood-entries/2025-01-15');

      expect(response.status).toBe(200);
      expect(response.body.entry.note).toBe(longNote);
    });

    it('should store and retrieve emoji correctly', async () => {
      const emojis = ['😊', '😢', '😡', '🎉', '💪'];

      for (let i = 0; i < emojis.length; i++) {
        await authAgent
          .post('/api/mood-entries')
          .send(testDataGenerators.moodEntry({
            date: `2025-01-${String(i + 1).padStart(2, '0')}`,
            emoji: emojis[i]
          }));
      }

      const response = await authAgent.get('/api/mood-entries');

      expect(response.status).toBe(200);
      expect(response.body.entries).toHaveLength(5);

      // Check each emoji was stored correctly
      for (const entry of response.body.entries) {
        expect(emojis).toContain(entry.emoji);
      }
    });

    it('should include timestamp in entry', async () => {
      const beforeCreate = new Date().toISOString();

      await authAgent
        .post('/api/mood-entries')
        .send(testDataGenerators.moodEntry({ date: '2025-01-15' }));

      const afterCreate = new Date().toISOString();

      const response = await authAgent.get('/api/mood-entries/2025-01-15');

      expect(response.status).toBe(200);
      expect(response.body.entry.timestamp).toBeDefined();

      // Timestamp should be between before and after create times
      const timestamp = response.body.entry.timestamp;
      expect(timestamp >= beforeCreate).toBe(true);
      expect(timestamp <= afterCreate).toBe(true);
    });
  });
});
