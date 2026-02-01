const request = require('supertest');
const { clearTestDatabase, createTestUser } = require('../../setup/testDatabase');
const { createAuthenticatedAgent, testDataGenerators } = require('../../setup/testHelpers');

// Import app after testDatabase sets up environment
const app = require('../../../server');

describe('Journal Entries API', () => {
  let testUser;
  let authAgent;

  beforeEach(async () => {
    clearTestDatabase();
    testUser = await createTestUser({
      email: 'journal@my.yorku.ca',
      password: 'Test123!@#'
    });
    authAgent = await createAuthenticatedAgent(app, testUser);
  });

  describe('POST /api/journal-entries', () => {
    it('should create a new journal entry with title and content', async () => {
      const journalData = testDataGenerators.journalEntry();

      const response = await authAgent
        .post('/api/journal-entries')
        .send(journalData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Journal entry saved successfully');
      expect(response.body.entry.title).toBe(journalData.title);
      expect(response.body.entry.content).toBe(journalData.content);
      expect(response.body.entry.id).toBeDefined();
      expect(response.body.entry.createdAt).toBeDefined();
    });

    it('should create a journal entry with default title when title is not provided', async () => {
      const journalData = { content: 'Content without title' };

      const response = await authAgent
        .post('/api/journal-entries')
        .send(journalData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entry.title).toBe('Untitled');
      expect(response.body.entry.content).toBe('Content without title');
    });

    it('should create a journal entry with default title when title is empty string', async () => {
      const journalData = { title: '', content: 'Content with empty title' };

      const response = await authAgent
        .post('/api/journal-entries')
        .send(journalData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entry.title).toBe('Untitled');
    });

    it('should create a journal entry with default title when title is whitespace only', async () => {
      const journalData = { title: '   ', content: 'Content with whitespace title' };

      const response = await authAgent
        .post('/api/journal-entries')
        .send(journalData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entry.title).toBe('Untitled');
    });

    it('should reject journal entry without content', async () => {
      const response = await authAgent
        .post('/api/journal-entries')
        .send({ title: 'Title Only' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('content is required');
    });

    it('should reject journal entry with empty content', async () => {
      const response = await authAgent
        .post('/api/journal-entries')
        .send({ title: 'Title', content: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('content is required');
    });

    it('should reject journal entry with whitespace-only content', async () => {
      const response = await authAgent
        .post('/api/journal-entries')
        .send({ title: 'Title', content: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('content is required');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry());

      // Should redirect to login or return 401
      expect([302, 401]).toContain(response.status);
    });

    it('should trim whitespace from title and content', async () => {
      const journalData = {
        title: '  Trimmed Title  ',
        content: '  Trimmed Content  '
      };

      const response = await authAgent
        .post('/api/journal-entries')
        .send(journalData);

      expect(response.status).toBe(200);
      expect(response.body.entry.title).toBe('Trimmed Title');
      expect(response.body.entry.content).toBe('Trimmed Content');
    });
  });

  describe('GET /api/journal-entries', () => {
    it('should return user journal entries', async () => {
      // Create journal entries first
      await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry({ title: 'Entry 1', content: 'Content 1' }));

      await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry({ title: 'Entry 2', content: 'Content 2' }));

      const response = await authAgent.get('/api/journal-entries');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entries).toHaveLength(2);
    });

    it('should return empty array when no entries exist', async () => {
      const response = await authAgent.get('/api/journal-entries');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entries).toHaveLength(0);
    });

    it('should respect limit query parameter', async () => {
      // Create 5 entries
      for (let i = 1; i <= 5; i++) {
        await authAgent
          .post('/api/journal-entries')
          .send(testDataGenerators.journalEntry({ title: `Entry ${i}`, content: `Content ${i}` }));
      }

      const response = await authAgent.get('/api/journal-entries?limit=3');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entries).toHaveLength(3);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/journal-entries');

      // Should redirect to login or return 401
      expect([302, 401]).toContain(response.status);
    });

    it('should not return entries from other users', async () => {
      // Create entry with first user
      await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry({ title: 'User 1 Entry' }));

      // Create second user
      const otherUser = await createTestUser({
        email: 'other@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);

      // Second user should not see first user's entries
      const response = await otherAgent.get('/api/journal-entries');

      expect(response.status).toBe(200);
      expect(response.body.entries).toHaveLength(0);
    });
  });

  describe('GET /api/journal-entries/:id', () => {
    it('should return a specific journal entry by ID', async () => {
      const createResponse = await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry({ title: 'Specific Entry' }));

      const entryId = createResponse.body.entry.id;

      const response = await authAgent.get(`/api/journal-entries/${entryId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entry.id).toBe(entryId);
      expect(response.body.entry.title).toBe('Specific Entry');
    });

    it('should return 404 for non-existent entry', async () => {
      const response = await authAgent.get('/api/journal-entries/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Entry not found');
    });

    it('should return 403 when accessing another user entry', async () => {
      // Create entry with first user
      const createResponse = await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry());

      const entryId = createResponse.body.entry.id;

      // Create second user
      const otherUser = await createTestUser({
        email: 'other@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);

      // Second user tries to access first user's entry
      const response = await otherAgent.get(`/api/journal-entries/${entryId}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/journal-entries/some-id');

      // Should redirect to login or return 401
      expect([302, 401]).toContain(response.status);
    });
  });

  describe('PUT /api/journal-entries/:id', () => {
    it('should update a journal entry', async () => {
      const createResponse = await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry({ title: 'Original Title', content: 'Original Content' }));

      const entryId = createResponse.body.entry.id;

      const response = await authAgent
        .put(`/api/journal-entries/${entryId}`)
        .send({
          title: 'Updated Title',
          content: 'Updated Content'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Journal entry updated successfully');
      expect(response.body.entry.title).toBe('Updated Title');
      expect(response.body.entry.content).toBe('Updated Content');
    });

    it('should update entry with default title when title is empty', async () => {
      const createResponse = await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry());

      const entryId = createResponse.body.entry.id;

      const response = await authAgent
        .put(`/api/journal-entries/${entryId}`)
        .send({
          title: '',
          content: 'Updated Content'
        });

      expect(response.status).toBe(200);
      expect(response.body.entry.title).toBe('Untitled');
    });

    it('should reject update without content', async () => {
      const createResponse = await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry());

      const entryId = createResponse.body.entry.id;

      const response = await authAgent
        .put(`/api/journal-entries/${entryId}`)
        .send({
          title: 'Updated Title'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('content is required');
    });

    it('should reject update with empty content', async () => {
      const createResponse = await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry());

      const entryId = createResponse.body.entry.id;

      const response = await authAgent
        .put(`/api/journal-entries/${entryId}`)
        .send({
          title: 'Updated Title',
          content: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('content is required');
    });

    it('should return 404 for non-existent entry', async () => {
      const response = await authAgent
        .put('/api/journal-entries/nonexistent-id')
        .send({
          title: 'Updated Title',
          content: 'Updated Content'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Entry not found or access denied');
    });

    it('should not allow updating another user entry', async () => {
      // Create entry with first user
      const createResponse = await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry());

      const entryId = createResponse.body.entry.id;

      // Create second user
      const otherUser = await createTestUser({
        email: 'other@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);

      // Second user tries to update first user's entry
      const response = await otherAgent
        .put(`/api/journal-entries/${entryId}`)
        .send({
          title: 'Hacked Title',
          content: 'Hacked Content'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Entry not found or access denied');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/journal-entries/some-id')
        .send({
          title: 'Updated Title',
          content: 'Updated Content'
        });

      // Should redirect to login or return 401
      expect([302, 401]).toContain(response.status);
    });

    it('should trim whitespace from updated title and content', async () => {
      const createResponse = await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry());

      const entryId = createResponse.body.entry.id;

      const response = await authAgent
        .put(`/api/journal-entries/${entryId}`)
        .send({
          title: '  Trimmed Updated Title  ',
          content: '  Trimmed Updated Content  '
        });

      expect(response.status).toBe(200);
      expect(response.body.entry.title).toBe('Trimmed Updated Title');
      expect(response.body.entry.content).toBe('Trimmed Updated Content');
    });
  });

  describe('DELETE /api/journal-entries/:id', () => {
    it('should delete a journal entry', async () => {
      const createResponse = await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry());

      const entryId = createResponse.body.entry.id;

      const response = await authAgent.delete(`/api/journal-entries/${entryId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Journal entry deleted successfully');

      // Verify deletion
      const getResponse = await authAgent.get('/api/journal-entries');
      expect(getResponse.body.entries).toHaveLength(0);
    });

    it('should return 404 for non-existent entry', async () => {
      const response = await authAgent.delete('/api/journal-entries/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Entry not found or access denied');
    });

    it('should not allow deleting another user entry', async () => {
      // Create entry with first user
      const createResponse = await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry());

      const entryId = createResponse.body.entry.id;

      // Create second user
      const otherUser = await createTestUser({
        email: 'other@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);

      // Second user tries to delete first user's entry
      const response = await otherAgent.delete(`/api/journal-entries/${entryId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Entry not found or access denied');

      // Verify entry still exists for original user
      const getResponse = await authAgent.get('/api/journal-entries');
      expect(getResponse.body.entries).toHaveLength(1);
    });

    it('should require authentication', async () => {
      const response = await request(app).delete('/api/journal-entries/some-id');

      // Should redirect to login or return 401
      expect([302, 401]).toContain(response.status);
    });
  });

  describe('Journal Entry Isolation', () => {
    it('should keep entries isolated between users', async () => {
      // Create entries with first user
      await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry({ title: 'User 1 Entry 1' }));
      await authAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry({ title: 'User 1 Entry 2' }));

      // Create second user and their entries
      const otherUser = await createTestUser({
        email: 'other@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);

      await otherAgent
        .post('/api/journal-entries')
        .send(testDataGenerators.journalEntry({ title: 'User 2 Entry 1' }));

      // Verify first user sees only their entries
      const user1Response = await authAgent.get('/api/journal-entries');
      expect(user1Response.body.entries).toHaveLength(2);
      expect(user1Response.body.entries.every(e =>
        e.title === 'User 1 Entry 1' || e.title === 'User 1 Entry 2'
      )).toBe(true);

      // Verify second user sees only their entries
      const user2Response = await otherAgent.get('/api/journal-entries');
      expect(user2Response.body.entries).toHaveLength(1);
      expect(user2Response.body.entries[0].title).toBe('User 2 Entry 1');
    });
  });
});
