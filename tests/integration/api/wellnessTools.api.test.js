const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { clearTestDatabase, createTestUser, createTestAdmin } = require('../../setup/testDatabase');
const { createAuthenticatedAgent } = require('../../setup/testHelpers');

// Import app after testDatabase sets up environment
const app = require('../../../server');

describe('Wellness Tools page and content API', () => {
  const contentFilePath = path.join(__dirname, '../../../content.json');
  let originalContentJson = null;
  let studentUser;
  let adminUser;
  let studentAgent;
  let adminAgent;

  beforeEach(async () => {
    clearTestDatabase();

    originalContentJson = fs.readFileSync(contentFilePath, 'utf8');

    studentUser = await createTestUser({
      email: 'wellness-student@my.yorku.ca',
      password: 'Test123!@#'
    });

    adminUser = await createTestAdmin({
      email: 'wellness-admin@my.yorku.ca',
      password: 'Test123!@#'
    });

    studentAgent = await createAuthenticatedAgent(app, studentUser);
    adminAgent = await createAuthenticatedAgent(app, adminUser);
  });

  afterEach(() => {
    if (originalContentJson !== null) {
      fs.writeFileSync(contentFilePath, originalContentJson);
    }
  });

  describe('GET /wellness-tools.html', () => {
    it('should serve the wellness tools page', async () => {
      const response = await request(app).get('/wellness-tools.html');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Wellness Tools');
      expect(response.text).toContain('Mark Complete');
    });
  });

  describe('GET /api/content', () => {
    it('should return content collections used by wellness pages', async () => {
      const response = await request(app).get('/api/content');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('prompts');
      expect(response.body).toHaveProperty('games');
      expect(response.body).toHaveProperty('exercises');
      expect(Array.isArray(response.body.exercises)).toBe(true);
    });
  });

  describe('POST /api/content/exercises', () => {
    it('should reject unauthenticated writes', async () => {
      const response = await request(app)
        .post('/api/content/exercises')
        .send({ id: 'exercise_unauth', title: 'Test', instructions: 'Test instructions' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Not authenticated');
    });

    it('should reject non-admin writes', async () => {
      const response = await studentAgent
        .post('/api/content/exercises')
        .send({ id: 'exercise_student', title: 'Student Write', instructions: 'Should fail' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should allow admin to create exercise content', async () => {
      const newExercise = {
        id: `exercise_${Date.now()}`,
        title: 'Box Breathing',
        instructions: 'Breathe in 4, hold 4, out 4, hold 4.'
      };

      const createResponse = await adminAgent
        .post('/api/content/exercises')
        .send(newExercise);

      expect(createResponse.status).toBe(200);
      expect(createResponse.body.ok).toBe(true);

      const readResponse = await request(app).get('/api/content');
      expect(readResponse.status).toBe(200);
      expect(readResponse.body.exercises.some((e) => e.id === newExercise.id)).toBe(true);
    });
  });

  describe('PUT and DELETE /api/content/exercises/:id', () => {
    it('should allow admin to update and delete exercise content', async () => {
      const exercise = {
        id: `exercise_${Date.now()}`,
        title: 'Mindful Pause',
        instructions: 'Pause and breathe for one minute.'
      };

      await adminAgent.post('/api/content/exercises').send(exercise).expect(200);

      const updateResponse = await adminAgent
        .put(`/api/content/exercises/${encodeURIComponent(exercise.id)}`)
        .send({ title: 'Mindful Pause Updated' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.ok).toBe(true);

      const afterUpdate = await request(app).get('/api/content');
      const updatedExercise = afterUpdate.body.exercises.find((e) => e.id === exercise.id);
      expect(updatedExercise).toBeDefined();
      expect(updatedExercise.title).toBe('Mindful Pause Updated');

      const deleteResponse = await adminAgent
        .delete(`/api/content/exercises/${encodeURIComponent(exercise.id)}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.ok).toBe(true);

      const afterDelete = await request(app).get('/api/content');
      expect(afterDelete.body.exercises.some((e) => e.id === exercise.id)).toBe(false);
    });
  });
});
