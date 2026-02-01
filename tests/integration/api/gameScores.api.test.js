const request = require('supertest');
const { clearTestDatabase, createTestUser } = require('../../setup/testDatabase');
const { createAuthenticatedAgent, testDataGenerators } = require('../../setup/testHelpers');

// Import app after testDatabase sets up environment
const app = require('../../../server');

describe('Game Scores API', () => {
  let testUser;
  let authAgent;

  beforeEach(async () => {
    clearTestDatabase();
    testUser = await createTestUser({
      email: 'gamescores@my.yorku.ca',
      password: 'Test123!@#'
    });
    authAgent = await createAuthenticatedAgent(app, testUser);
  });

  describe('POST /api/game-scores', () => {
    it('should save a new game score', async () => {
      const scoreData = testDataGenerators.gameScore();

      const response = await authAgent
        .post('/api/game-scores')
        .send(scoreData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Score saved successfully');
      expect(response.body.score.gameId).toBe(scoreData.gameId);
      expect(response.body.score.score).toBe(scoreData.score);
      expect(response.body.score.userId).toBe(testUser.id);
      expect(response.body.score.id).toBeDefined();
      expect(response.body.score.completedAt).toBeDefined();
    });

    it('should save a game score with metadata', async () => {
      const scoreData = testDataGenerators.gameScore({
        metadata: { level: 5, timeElapsed: 120 }
      });

      const response = await authAgent
        .post('/api/game-scores')
        .send(scoreData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.score.metadata).toBe(JSON.stringify(scoreData.metadata));
    });

    it('should reject score without gameId', async () => {
      const response = await authAgent
        .post('/api/game-scores')
        .send({ score: 100 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('gameId and score are required');
    });

    it('should reject score without score value', async () => {
      const response = await authAgent
        .post('/api/game-scores')
        .send({ gameId: 'brick-breaker' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('gameId and score are required');
    });

    it('should reject negative score', async () => {
      const response = await authAgent
        .post('/api/game-scores')
        .send({ gameId: 'brick-breaker', score: -10 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('score must be a non-negative number');
    });

    it('should reject non-numeric score', async () => {
      const response = await authAgent
        .post('/api/game-scores')
        .send({ gameId: 'brick-breaker', score: 'high' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('score must be a non-negative number');
    });

    it('should accept zero score', async () => {
      const response = await authAgent
        .post('/api/game-scores')
        .send({ gameId: 'brick-breaker', score: 0 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.score.score).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore());

      // Should redirect to login or return 401
      expect([302, 401]).toContain(response.status);
    });
  });

  describe('GET /api/game-scores/:gameId/user', () => {
    it('should return user scores for a game', async () => {
      // Create some scores first
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 100 }));
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 200 }));

      const response = await authAgent.get('/api/game-scores/brick-breaker/user');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.scores).toHaveLength(2);
    });

    it('should return empty array when no scores exist', async () => {
      const response = await authAgent.get('/api/game-scores/brick-breaker/user');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.scores).toHaveLength(0);
    });

    it('should only return scores for the specified game', async () => {
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ gameId: 'brick-breaker', score: 100 }));
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ gameId: 'other-game', score: 200 }));

      const response = await authAgent.get('/api/game-scores/brick-breaker/user');

      expect(response.status).toBe(200);
      expect(response.body.scores).toHaveLength(1);
      expect(response.body.scores[0].gameId).toBe('brick-breaker');
    });

    it('should parse metadata JSON', async () => {
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ metadata: { level: 5 } }));

      const response = await authAgent.get('/api/game-scores/brick-breaker/user');

      expect(response.status).toBe(200);
      expect(response.body.scores[0].metadata).toEqual({ level: 5 });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/game-scores/brick-breaker/user');

      expect([302, 401]).toContain(response.status);
    });

    it('should not return scores from other users', async () => {
      // Create score with first user
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 100 }));

      // Create second user and agent
      const otherUser = await createTestUser({
        email: 'other@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);

      // Get scores with second user
      const response = await otherAgent.get('/api/game-scores/brick-breaker/user');

      expect(response.status).toBe(200);
      expect(response.body.scores).toHaveLength(0);
    });
  });

  describe('GET /api/game-scores/:gameId/leaderboard', () => {
    it('should return top scores for a game', async () => {
      // Create scores
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 100 }));
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 300 }));
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 200 }));

      const response = await request(app)
        .get('/api/game-scores/brick-breaker/leaderboard');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.scores).toHaveLength(3);
      // Scores should be sorted by score descending
      expect(response.body.scores[0].score).toBe(300);
      expect(response.body.scores[1].score).toBe(200);
      expect(response.body.scores[2].score).toBe(100);
    });

    it('should return empty array when no scores exist', async () => {
      const response = await request(app)
        .get('/api/game-scores/brick-breaker/leaderboard');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.scores).toHaveLength(0);
    });

    it('should not require authentication (public endpoint)', async () => {
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 100 }));

      const response = await request(app)
        .get('/api/game-scores/brick-breaker/leaderboard');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should anonymize user emails', async () => {
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 100 }));

      const response = await request(app)
        .get('/api/game-scores/brick-breaker/leaderboard');

      expect(response.status).toBe(200);
      expect(response.body.scores[0].userEmail).toMatch(/^.{1}\*{3}$/);
      // Should not expose full email
      expect(response.body.scores[0].userEmail).not.toBe(testUser.email);
    });

    it('should only return scores for the specified game', async () => {
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ gameId: 'brick-breaker', score: 100 }));
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ gameId: 'other-game', score: 200 }));

      const response = await request(app)
        .get('/api/game-scores/brick-breaker/leaderboard');

      expect(response.status).toBe(200);
      expect(response.body.scores).toHaveLength(1);
      expect(response.body.scores[0].gameId).toBe('brick-breaker');
    });

    it('should limit to top 10 scores', async () => {
      // Create 15 scores
      for (let i = 1; i <= 15; i++) {
        await authAgent
          .post('/api/game-scores')
          .send(testDataGenerators.gameScore({ score: i * 10 }));
      }

      const response = await request(app)
        .get('/api/game-scores/brick-breaker/leaderboard');

      expect(response.status).toBe(200);
      expect(response.body.scores).toHaveLength(10);
      // Should have the top 10 scores (150, 140, 130, ... 60)
      expect(response.body.scores[0].score).toBe(150);
      expect(response.body.scores[9].score).toBe(60);
    });

    it('should include scores from multiple users', async () => {
      // Create score with first user
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 100 }));

      // Create second user and add score
      const otherUser = await createTestUser({
        email: 'other@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);
      await otherAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 200 }));

      const response = await request(app)
        .get('/api/game-scores/brick-breaker/leaderboard');

      expect(response.status).toBe(200);
      expect(response.body.scores).toHaveLength(2);
    });
  });

  describe('GET /api/game-scores/:gameId/personal-best', () => {
    it('should return user personal best score', async () => {
      // Create multiple scores
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 100 }));
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 300 }));
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 200 }));

      const response = await authAgent.get('/api/game-scores/brick-breaker/personal-best');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.score.score).toBe(300);
    });

    it('should return 404 when no scores exist', async () => {
      const response = await authAgent.get('/api/game-scores/brick-breaker/personal-best');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/game-scores/brick-breaker/personal-best');

      expect([302, 401]).toContain(response.status);
    });

    it('should only consider user own scores for personal best', async () => {
      // Create score with first user
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 100 }));

      // Create second user with higher score
      const otherUser = await createTestUser({
        email: 'other@my.yorku.ca',
        password: 'Test123!@#'
      });
      const otherAgent = await createAuthenticatedAgent(app, otherUser);
      await otherAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 500 }));

      // First user's personal best should still be 100
      const response = await authAgent.get('/api/game-scores/brick-breaker/personal-best');

      expect(response.status).toBe(200);
      expect(response.body.score.score).toBe(100);
    });

    it('should only return personal best for specified game', async () => {
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ gameId: 'brick-breaker', score: 100 }));
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ gameId: 'other-game', score: 500 }));

      const response = await authAgent.get('/api/game-scores/brick-breaker/personal-best');

      expect(response.status).toBe(200);
      expect(response.body.score.score).toBe(100);
      expect(response.body.score.gameId).toBe('brick-breaker');
    });

    it('should parse metadata JSON', async () => {
      await authAgent
        .post('/api/game-scores')
        .send(testDataGenerators.gameScore({ score: 100, metadata: { level: 10 } }));

      const response = await authAgent.get('/api/game-scores/brick-breaker/personal-best');

      expect(response.status).toBe(200);
      expect(response.body.score.metadata).toEqual({ level: 10 });
    });
  });
});
