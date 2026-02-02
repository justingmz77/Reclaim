const request = require('supertest');
const { clearTestDatabase, createTestUser, createTestAdmin } = require('../../setup/testDatabase');
const { createAuthenticatedAgent } = require('../../setup/testHelpers');

// Import app after testDatabase sets up environment
const app = require('../../../server');

describe('Admin API', () => {
  let adminUser;
  let adminAgent;
  let regularUser;
  let regularAgent;

  beforeEach(async () => {
    clearTestDatabase();

    // Create an admin user
    adminUser = await createTestAdmin({
      email: 'admin@my.yorku.ca',
      password: 'Admin123!@#'
    });
    adminAgent = await createAuthenticatedAgent(app, adminUser);

    // Create a regular student user
    regularUser = await createTestUser({
      email: 'student@my.yorku.ca',
      password: 'Student123!@#'
    });
    regularAgent = await createAuthenticatedAgent(app, regularUser);
  });

  describe('GET /api/admin/users', () => {
    it('should return all users when admin is authenticated', async () => {
      const response = await adminAgent.get('/api/admin/users');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThanOrEqual(2);
    });

    it('should not include passwords in response', async () => {
      const response = await adminAgent.get('/api/admin/users');

      expect(response.status).toBe(200);
      response.body.users.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });

    it('should return user details without password', async () => {
      const response = await adminAgent.get('/api/admin/users');

      expect(response.status).toBe(200);
      const foundAdmin = response.body.users.find(u => u.email === 'admin@my.yorku.ca');
      expect(foundAdmin).toBeDefined();
      expect(foundAdmin.role).toBe('admin');
      expect(foundAdmin.id).toBeDefined();
      expect(foundAdmin.email).toBeDefined();
    });

    it('should return 403 when non-admin user tries to access', async () => {
      const response = await regularAgent.get('/api/admin/users');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin access required');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/admin/users');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Not authenticated');
    });
  });

  describe('POST /api/admin/users', () => {
    const validUserData = {
      email: 'newuser@my.yorku.ca',
      password: 'NewUser123!@#',
      role: 'student'
    };

    it('should create a new user when admin is authenticated', async () => {
      const response = await adminAgent
        .post('/api/admin/users')
        .send(validUserData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('newuser@my.yorku.ca');
      expect(response.body.user.role).toBe('student');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should create an admin user when admin specifies admin role', async () => {
      const response = await adminAgent
        .post('/api/admin/users')
        .send({
          email: 'newadmin@my.yorku.ca',
          password: 'NewAdmin123!@#',
          role: 'admin'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('admin');
    });

    it('should reject invalid role', async () => {
      const response = await adminAgent
        .post('/api/admin/users')
        .send({
          email: 'test@my.yorku.ca',
          password: 'Test123!@#',
          role: 'superuser'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Role must be');
    });

    it('should reject missing email', async () => {
      const response = await adminAgent
        .post('/api/admin/users')
        .send({
          password: 'Test123!@#',
          role: 'student'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Email and password are required');
    });

    it('should reject missing password', async () => {
      const response = await adminAgent
        .post('/api/admin/users')
        .send({
          email: 'test@my.yorku.ca',
          role: 'student'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Email and password are required');
    });

    it('should reject missing role', async () => {
      const response = await adminAgent
        .post('/api/admin/users')
        .send({
          email: 'test@my.yorku.ca',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Role must be');
    });

    it('should reject non-YorkU email', async () => {
      const response = await adminAgent
        .post('/api/admin/users')
        .send({
          email: 'user@gmail.com',
          password: 'Test123!@#',
          role: 'student'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('YorkU');
    });

    it('should reject duplicate email', async () => {
      const response = await adminAgent
        .post('/api/admin/users')
        .send({
          email: 'student@my.yorku.ca', // Already exists
          password: 'Test123!@#',
          role: 'student'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject weak password', async () => {
      const response = await adminAgent
        .post('/api/admin/users')
        .send({
          email: 'test@my.yorku.ca',
          password: 'weak',
          role: 'student'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Password must be');
    });

    it('should return 403 when non-admin user tries to create user', async () => {
      const response = await regularAgent
        .post('/api/admin/users')
        .send(validUserData);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin access required');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .send(validUserData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Not authenticated');
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('should update user role when admin is authenticated', async () => {
      const response = await adminAgent
        .put(`/api/admin/users/${regularUser.id}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should change student to admin', async () => {
      const response = await adminAgent
        .put(`/api/admin/users/${regularUser.id}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify the change
      const usersResponse = await adminAgent.get('/api/admin/users');
      const updatedUser = usersResponse.body.users.find(u => u.id === regularUser.id);
      expect(updatedUser.role).toBe('admin');
    });

    it('should change admin to student', async () => {
      // Create another admin to change to student
      const anotherAdmin = await createTestAdmin({
        email: 'otheradmin@my.yorku.ca',
        password: 'Other123!@#'
      });

      const response = await adminAgent
        .put(`/api/admin/users/${anotherAdmin.id}`)
        .send({ role: 'student' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid role', async () => {
      const response = await adminAgent
        .put(`/api/admin/users/${regularUser.id}`)
        .send({ role: 'superuser' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Role must be');
    });

    it('should prevent admin from changing their own role', async () => {
      const response = await adminAgent
        .put(`/api/admin/users/${adminUser.id}`)
        .send({ role: 'student' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot change your own role');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await adminAgent
        .put('/api/admin/users/nonexistent-user-id')
        .send({ role: 'admin' });

      expect(response.status).toBe(404);
    });

    it('should return 403 when non-admin user tries to update', async () => {
      const response = await regularAgent
        .put(`/api/admin/users/${regularUser.id}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin access required');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUser.id}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Not authenticated');
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete a user when admin is authenticated', async () => {
      const response = await adminAgent
        .delete(`/api/admin/users/${regularUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should actually remove the user from database', async () => {
      await adminAgent.delete(`/api/admin/users/${regularUser.id}`);

      // Verify deletion
      const usersResponse = await adminAgent.get('/api/admin/users');
      const deletedUser = usersResponse.body.users.find(u => u.id === regularUser.id);
      expect(deletedUser).toBeUndefined();
    });

    it('should prevent admin from deleting themselves', async () => {
      const response = await adminAgent
        .delete(`/api/admin/users/${adminUser.id}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot delete your own account');
    });

    it('should allow deleting another admin user', async () => {
      // Create another admin
      const anotherAdmin = await createTestAdmin({
        email: 'otheradmin@my.yorku.ca',
        password: 'Other123!@#'
      });

      const response = await adminAgent
        .delete(`/api/admin/users/${anotherAdmin.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await adminAgent
        .delete('/api/admin/users/nonexistent-user-id');

      expect(response.status).toBe(404);
    });

    it('should return 403 when non-admin user tries to delete', async () => {
      // Create a user to try to delete
      const userToDelete = await createTestUser({
        email: 'todelete@my.yorku.ca',
        password: 'Delete123!@#'
      });

      const response = await regularAgent
        .delete(`/api/admin/users/${userToDelete.id}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin access required');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${regularUser.id}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Not authenticated');
    });
  });

  describe('Admin authorization edge cases', () => {
    it('should reject admin access if user role changes mid-session', async () => {
      // Create another admin to demote the first admin
      const superAdmin = await createTestAdmin({
        email: 'super@my.yorku.ca',
        password: 'Super123!@#'
      });
      const superAdminAgent = await createAuthenticatedAgent(app, superAdmin);

      // Demote admin to student using super admin
      await superAdminAgent
        .put(`/api/admin/users/${adminUser.id}`)
        .send({ role: 'student' });

      // Now the original admin (whose role was changed) should be denied
      const response = await adminAgent.get('/api/admin/users');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin access required');
    });

    it('should allow newly promoted admin to access admin endpoints', async () => {
      // Promote regular user to admin
      await adminAgent
        .put(`/api/admin/users/${regularUser.id}`)
        .send({ role: 'admin' });

      // The regular user (now admin) should be able to access admin endpoints
      const response = await regularAgent.get('/api/admin/users');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
