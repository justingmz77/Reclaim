const request = require('supertest');
const { clearTestDatabase, createTestUser } = require('../../setup/testDatabase');

// Import app after testDatabase sets up environment
const app = require('../../../server');

describe('Authentication API', () => {
  beforeEach(() => {
    clearTestDatabase();
  });

  describe('POST /api/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          email: 'newuser@my.yorku.ca',
          password: 'ValidPass123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('newuser@my.yorku.ca');
      expect(response.body.user.role).toBe('student');
    });

    it('should reject non-YorkU emails', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          email: 'user@gmail.com',
          password: 'ValidPass123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('YorkU');
    });

    it('should reject duplicate emails', async () => {
      // Create first user
      await request(app)
        .post('/api/register')
        .send({
          email: 'duplicate@my.yorku.ca',
          password: 'ValidPass123!'
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/register')
        .send({
          email: 'duplicate@my.yorku.ca',
          password: 'ValidPass123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          password: 'ValidPass123!'
        });

      expect(response.status).toBe(400);
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          email: 'user@my.yorku.ca'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/login', () => {
    beforeEach(async () => {
      await createTestUser({
        email: 'logintest@my.yorku.ca',
        password: 'Test123!@#'
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'logintest@my.yorku.ca',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('logintest@my.yorku.ca');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'logintest@my.yorku.ca',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid password');
    });

    it('should return USER_NOT_FOUND for non-existent user', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'nonexistent@my.yorku.ca',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /api/logout', () => {
    it('should successfully logout', async () => {
      const agent = request.agent(app);

      // Create and login user
      await createTestUser({
        email: 'logouttest@my.yorku.ca',
        password: 'Test123!@#'
      });

      await agent
        .post('/api/login')
        .send({
          email: 'logouttest@my.yorku.ca',
          password: 'Test123!@#'
        });

      // Logout
      const response = await agent.post('/api/logout');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/user', () => {
    it('should return current user when authenticated', async () => {
      const agent = request.agent(app);

      await createTestUser({
        email: 'currentuser@my.yorku.ca',
        password: 'Test123!@#'
      });

      await agent
        .post('/api/login')
        .send({
          email: 'currentuser@my.yorku.ca',
          password: 'Test123!@#'
        });

      const response = await agent.get('/api/user');

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('currentuser@my.yorku.ca');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/user');
      expect(response.status).toBe(401);
    });
  });
});
