const request = require('supertest');
const { clearTestDatabase, createTestUser } = require('../../setup/testDatabase');
const { createAuthenticatedAgent, testDataGenerators } = require('../../setup/testHelpers');

// Import app after testDatabase sets up environment
const app = require('../../../server');

describe('Habits API', () => {
  let testUser;
  let authAgent;

  beforeEach(async () => {
    clearTestDatabase();
    testUser = await createTestUser({
      email: 'habits@my.yorku.ca',
      password: 'Test123!@#'
    });
    authAgent = await createAuthenticatedAgent(app, testUser);
  });

  describe('POST /api/habits', () => {
    it('should create a new habit', async () => {
      const habitData = testDataGenerators.habit();

      const response = await authAgent
        .post('/api/habits')
        .send(habitData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.habit.name).toBe(habitData.name);
      expect(response.body.habit.status).toBe('in_progress');
      expect(response.body.habit.streak).toBe(0);
    });

    it('should reject habit without name', async () => {
      const response = await authAgent
        .post('/api/habits')
        .send({ description: 'No name', reminderFrequency: 'daily' });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/habits')
        .send(testDataGenerators.habit());

      // Should redirect to login or return 401
      expect([302, 401]).toContain(response.status);
    });
  });

  describe('GET /api/habits', () => {
    it('should return user habits', async () => {
      // Create a habit first
      await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit({ name: 'Morning Run' }));

      const response = await authAgent.get('/api/habits');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.habits).toHaveLength(1);
      expect(response.body.habits[0].name).toBe('Morning Run');
    });

    it('should return empty array when no habits exist', async () => {
      const response = await authAgent.get('/api/habits');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.habits).toHaveLength(0);
    });

    it('should include completion history with habits', async () => {
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit());

      const habitId = createResponse.body.habit.id;
      const today = new Date().toISOString().split('T')[0];

      await authAgent
        .post(`/api/habits/${habitId}/complete`)
        .send({ date: today });

      const response = await authAgent.get('/api/habits');

      expect(response.status).toBe(200);
      expect(response.body.habits[0].completionHistory).toBeDefined();
      expect(response.body.habits[0].completionHistory).toContain(today);
    });
  });

  describe('GET /api/habits/:id', () => {
    it('should return a specific habit', async () => {
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit({ name: 'Test Habit' }));

      const habitId = createResponse.body.habit.id;

      const response = await authAgent.get(`/api/habits/${habitId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.habit.name).toBe('Test Habit');
    });

    it('should return 404 for non-existent habit', async () => {
      const response = await authAgent.get('/api/habits/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Habit not found');
    });

    it('should return 403 for another user habit', async () => {
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit());

      const habitId = createResponse.body.habit.id;

      const otherUser = await createTestUser({
        email: 'other2@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);

      const response = await otherAgent.get(`/api/habits/${habitId}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });

    it('should include completion history', async () => {
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit());

      const habitId = createResponse.body.habit.id;
      const today = new Date().toISOString().split('T')[0];

      await authAgent
        .post(`/api/habits/${habitId}/complete`)
        .send({ date: today });

      const response = await authAgent.get(`/api/habits/${habitId}`);

      expect(response.status).toBe(200);
      expect(response.body.habit.completionHistory).toContain(today);
    });
  });

  describe('PUT /api/habits/:id', () => {
    it('should update a habit', async () => {
      // Create a habit first
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit({ name: 'Original Name' }));

      const habitId = createResponse.body.habit.id;

      // Update the habit
      const response = await authAgent
        .put(`/api/habits/${habitId}`)
        .send({
          name: 'Updated Name',
          reminderFrequency: 'weekly'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Habit updated successfully');
    });

    it('should return 404 for non-existent habit', async () => {
      const response = await authAgent
        .put('/api/habits/nonexistent-id')
        .send({
          name: 'Updated Name',
          reminderFrequency: 'daily'
        });

      expect(response.status).toBe(404);
    });

    it('should reject update without required fields', async () => {
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit());

      const habitId = createResponse.body.habit.id;

      const response = await authAgent
        .put(`/api/habits/${habitId}`)
        .send({ description: 'Missing name and frequency' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('name and reminderFrequency are required');
    });

    it('should update with description', async () => {
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit());

      const habitId = createResponse.body.habit.id;

      const response = await authAgent
        .put(`/api/habits/${habitId}`)
        .send({
          name: 'Updated Name',
          description: 'Updated description',
          reminderFrequency: 'weekly'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/habits/:id/complete', () => {
    it('should mark habit as complete for today', async () => {
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit());

      const habitId = createResponse.body.habit.id;
      const today = new Date().toISOString().split('T')[0];

      const response = await authAgent
        .post(`/api/habits/${habitId}/complete`)
        .send({ date: today });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.streak).toBeDefined();
    });

    it('should reject without date', async () => {
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit());

      const habitId = createResponse.body.habit.id;

      const response = await authAgent
        .post(`/api/habits/${habitId}/complete`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('date is required');
    });

    it('should return 403 for non-existent habit', async () => {
      const response = await authAgent
        .post('/api/habits/nonexistent-id/complete')
        .send({ date: '2024-01-15' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });

    it('should return 403 for another user habit', async () => {
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit());

      const habitId = createResponse.body.habit.id;

      const otherUser = await createTestUser({
        email: 'other3@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);

      const response = await otherAgent
        .post(`/api/habits/${habitId}/complete`)
        .send({ date: '2024-01-15' });

      expect(response.status).toBe(403);
    });

    it('should reject duplicate completion for same date', async () => {
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit());

      const habitId = createResponse.body.habit.id;
      const today = new Date().toISOString().split('T')[0];

      await authAgent
        .post(`/api/habits/${habitId}/complete`)
        .send({ date: today });

      const response = await authAgent
        .post(`/api/habits/${habitId}/complete`)
        .send({ date: today });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Habit already completed on this date');
    });

    it('should return streak value after completion', async () => {
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit());

      const habitId = createResponse.body.habit.id;
      const today = new Date().toISOString().split('T')[0];

      // Complete habit for today
      const response = await authAgent
        .post(`/api/habits/${habitId}/complete`)
        .send({ date: today });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(typeof response.body.streak).toBe('number');
    });
  });

  describe('DELETE /api/habits/:id', () => {
    it('should delete a habit', async () => {
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit());

      const habitId = createResponse.body.habit.id;

      const response = await authAgent.delete(`/api/habits/${habitId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deletion
      const getResponse = await authAgent.get('/api/habits');
      expect(getResponse.body.habits).toHaveLength(0);
    });

    it('should not allow deleting other user habits', async () => {
      // Create habit with first user
      const createResponse = await authAgent
        .post('/api/habits')
        .send(testDataGenerators.habit());

      const habitId = createResponse.body.habit.id;

      // Create second user
      const otherUser = await createTestUser({
        email: 'other@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);

      // Try to delete with second user
      const response = await otherAgent.delete(`/api/habits/${habitId}`);

      expect(response.status).toBe(404);
    });
  });
});
