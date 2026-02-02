const { clearTestDatabase, createTestUser, getTestDatabase } = require('../setup/testDatabase');
const GameScores = require('../../utils/db/GameScores');

describe('GameScores Module - Unit Tests', () => {
  let testUser;
  let testUser2;
  let db;

  beforeAll(() => {
    db = getTestDatabase();
  });

  beforeEach(async () => {
    clearTestDatabase();
    testUser = await createTestUser({
      email: 'gamer1@my.yorku.ca',
      password: 'Test123!@#'
    });
    testUser2 = await createTestUser({
      email: 'gamer2@my.yorku.ca',
      password: 'Test123!@#'
    });
  });

  // Helper to generate unique score IDs
  const uniqueId = () => `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  describe('add', () => {
    it('should add a new game score successfully', () => {
      const scoreId = uniqueId();
      const result = GameScores.add(
        scoreId,
        testUser.id,
        'brick-breaker',
        100,
        null,
        new Date().toISOString()
      );

      expect(result.success).toBe(true);

      // Verify the entry was added
      const score = db.prepare('SELECT * FROM game_scores WHERE id = ?').get(scoreId);
      expect(score).toBeDefined();
      expect(score.userId).toBe(testUser.id);
      expect(score.gameId).toBe('brick-breaker');
      expect(score.score).toBe(100);
    });

    it('should add a score with metadata', () => {
      const scoreId = uniqueId();
      const metadata = JSON.stringify({ level: 5, bonus: true });
      const result = GameScores.add(
        scoreId,
        testUser.id,
        'memory-game',
        250,
        metadata,
        new Date().toISOString()
      );

      expect(result.success).toBe(true);

      const score = db.prepare('SELECT * FROM game_scores WHERE id = ?').get(scoreId);
      expect(score.metadata).toBe(metadata);
    });

    it('should fail when adding a score with duplicate id', () => {
      const scoreId = uniqueId();
      const timestamp = new Date().toISOString();

      GameScores.add(scoreId, testUser.id, 'brick-breaker', 100, null, timestamp);
      const result = GameScores.add(scoreId, testUser.id, 'brick-breaker', 200, null, timestamp);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when adding a score for non-existent user', () => {
      const result = GameScores.add(
        uniqueId(),
        'non-existent-user',
        'brick-breaker',
        100,
        null,
        new Date().toISOString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getUserScores', () => {
    it('should return all scores for a user and specific game', () => {
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 100, null, '2025-01-01T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 200, null, '2025-01-02T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 150, null, '2025-01-03T10:00:00Z');

      const result = GameScores.getUserScores(testUser.id, 'brick-breaker');

      expect(result.success).toBe(true);
      expect(result.scores).toHaveLength(3);
    });

    it('should return scores ordered by score descending, then by completedAt descending', () => {
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 100, null, '2025-01-01T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 200, null, '2025-01-02T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 150, null, '2025-01-03T10:00:00Z');

      const result = GameScores.getUserScores(testUser.id, 'brick-breaker');

      expect(result.success).toBe(true);
      expect(result.scores[0].score).toBe(200);
      expect(result.scores[1].score).toBe(150);
      expect(result.scores[2].score).toBe(100);
    });

    it('should return empty array when user has no scores for a game', () => {
      const result = GameScores.getUserScores(testUser.id, 'non-existent-game');

      expect(result.success).toBe(true);
      expect(result.scores).toHaveLength(0);
    });

    it('should return empty array for non-existent user', () => {
      const result = GameScores.getUserScores('non-existent-user', 'brick-breaker');

      expect(result.success).toBe(true);
      expect(result.scores).toHaveLength(0);
    });

    it('should only return scores for the specified game', () => {
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 100, null, '2025-01-01T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'memory-game', 300, null, '2025-01-01T10:00:00Z');

      const result = GameScores.getUserScores(testUser.id, 'memory-game');

      expect(result.success).toBe(true);
      expect(result.scores).toHaveLength(1);
      expect(result.scores[0].gameId).toBe('memory-game');
    });
  });

  describe('getTopScores', () => {
    it('should return top scores with user email', () => {
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 300, null, '2025-01-01T10:00:00Z');

      const result = GameScores.getTopScores('brick-breaker', 10);

      expect(result.success).toBe(true);
      expect(result.scores.length).toBeGreaterThan(0);
      expect(result.scores[0]).toHaveProperty('email');
    });

    it('should order scores by score descending, then by completedAt ascending', () => {
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 300, null, '2025-01-01T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 150, null, '2025-01-02T10:00:00Z');
      GameScores.add(uniqueId(), testUser2.id, 'brick-breaker', 250, null, '2025-01-01T11:00:00Z');
      GameScores.add(uniqueId(), testUser2.id, 'brick-breaker', 250, null, '2025-01-01T12:00:00Z');

      const result = GameScores.getTopScores('brick-breaker', 10);

      expect(result.success).toBe(true);
      expect(result.scores[0].score).toBe(300);
      expect(result.scores[1].score).toBe(250);
      // When scores are equal, earlier completedAt should come first
      expect(result.scores[1].completedAt).toBe('2025-01-01T11:00:00Z');
      expect(result.scores[2].completedAt).toBe('2025-01-01T12:00:00Z');
    });

    it('should respect the limit parameter', () => {
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 300, null, '2025-01-01T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 150, null, '2025-01-02T10:00:00Z');
      GameScores.add(uniqueId(), testUser2.id, 'brick-breaker', 250, null, '2025-01-01T11:00:00Z');

      const result = GameScores.getTopScores('brick-breaker', 2);

      expect(result.success).toBe(true);
      expect(result.scores).toHaveLength(2);
    });

    it('should return empty array when no scores exist for the game', () => {
      const result = GameScores.getTopScores('non-existent-game', 10);

      expect(result.success).toBe(true);
      expect(result.scores).toHaveLength(0);
    });

    it('should only return scores for the specified game', () => {
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 300, null, '2025-01-01T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'memory-game', 500, null, '2025-01-01T10:00:00Z');

      const result = GameScores.getTopScores('memory-game', 10);

      expect(result.success).toBe(true);
      expect(result.scores).toHaveLength(1);
      expect(result.scores[0].gameId).toBe('memory-game');
    });

    it('should include all required fields in response', () => {
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 300, null, '2025-01-01T10:00:00Z');

      const result = GameScores.getTopScores('brick-breaker', 1);

      expect(result.success).toBe(true);
      expect(result.scores[0]).toHaveProperty('id');
      expect(result.scores[0]).toHaveProperty('userId');
      expect(result.scores[0]).toHaveProperty('gameId');
      expect(result.scores[0]).toHaveProperty('score');
      expect(result.scores[0]).toHaveProperty('metadata');
      expect(result.scores[0]).toHaveProperty('completedAt');
      expect(result.scores[0]).toHaveProperty('email');
    });
  });

  describe('getUserBestScore', () => {
    it('should return the best score for a user', () => {
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 100, null, '2025-01-03T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 300, null, '2025-01-01T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 200, null, '2025-01-04T10:00:00Z');

      const result = GameScores.getUserBestScore(testUser.id, 'brick-breaker');

      expect(result.success).toBe(true);
      expect(result.score).toBeDefined();
      expect(result.score.score).toBe(300);
    });

    it('should return the earliest score when multiple scores have the same value', () => {
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 100, null, '2025-01-03T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 300, null, '2025-01-01T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 300, null, '2025-01-02T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 200, null, '2025-01-04T10:00:00Z');

      const result = GameScores.getUserBestScore(testUser.id, 'brick-breaker');

      expect(result.success).toBe(true);
      expect(result.score.score).toBe(300);
      // Should return the earliest completed one
      expect(result.score.completedAt).toBe('2025-01-01T10:00:00Z');
    });

    it('should return error when user has no scores for the game', () => {
      const result = GameScores.getUserBestScore(testUser.id, 'non-existent-game');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No scores found');
    });

    it('should return error for non-existent user', () => {
      const result = GameScores.getUserBestScore('non-existent-user', 'brick-breaker');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No scores found');
    });

    it('should return the correct score object with all fields', () => {
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 100, null, '2025-01-03T10:00:00Z');

      const result = GameScores.getUserBestScore(testUser.id, 'brick-breaker');

      expect(result.success).toBe(true);
      expect(result.score).toHaveProperty('id');
      expect(result.score).toHaveProperty('userId');
      expect(result.score).toHaveProperty('gameId');
      expect(result.score).toHaveProperty('score');
      expect(result.score).toHaveProperty('metadata');
      expect(result.score).toHaveProperty('completedAt');
    });

    it('should only consider scores for the specified game', () => {
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 100, null, '2025-01-03T10:00:00Z');
      GameScores.add(uniqueId(), testUser.id, 'brick-breaker', 300, null, '2025-01-01T10:00:00Z');
      // Add a higher score for a different game
      GameScores.add(uniqueId(), testUser.id, 'memory-game', 500, null, '2025-01-01T10:00:00Z');

      const result = GameScores.getUserBestScore(testUser.id, 'brick-breaker');

      expect(result.success).toBe(true);
      expect(result.score.gameId).toBe('brick-breaker');
      expect(result.score.score).toBe(300);
    });
  });

  describe('edge cases', () => {
    it('should handle zero score', () => {
      const scoreId = uniqueId();
      const result = GameScores.add(
        scoreId,
        testUser.id,
        'brick-breaker',
        0,
        null,
        new Date().toISOString()
      );

      expect(result.success).toBe(true);

      const bestResult = GameScores.getUserBestScore(testUser.id, 'brick-breaker');
      expect(bestResult.success).toBe(true);
      expect(bestResult.score.score).toBe(0);
    });

    it('should handle very large scores', () => {
      const largeScore = 999999999;
      const scoreId = uniqueId();
      const result = GameScores.add(
        scoreId,
        testUser.id,
        'brick-breaker',
        largeScore,
        null,
        new Date().toISOString()
      );

      expect(result.success).toBe(true);

      const bestResult = GameScores.getUserBestScore(testUser.id, 'brick-breaker');
      expect(bestResult.success).toBe(true);
      expect(bestResult.score.score).toBe(largeScore);
    });

    it('should handle complex metadata JSON', () => {
      const scoreId = uniqueId();
      const complexMetadata = JSON.stringify({
        level: 10,
        powerUps: ['speed', 'shield', 'multiball'],
        achievements: { firstWin: true, noHits: false },
        stats: { time: 120.5, accuracy: 0.95 }
      });

      const result = GameScores.add(
        scoreId,
        testUser.id,
        'brick-breaker',
        500,
        complexMetadata,
        new Date().toISOString()
      );

      expect(result.success).toBe(true);

      const scores = GameScores.getUserScores(testUser.id, 'brick-breaker');
      expect(scores.success).toBe(true);
      expect(scores.scores[0].metadata).toBe(complexMetadata);
    });

    it('should handle negative scores', () => {
      const scoreId = uniqueId();
      const result = GameScores.add(
        scoreId,
        testUser.id,
        'brick-breaker',
        -50,
        null,
        new Date().toISOString()
      );

      expect(result.success).toBe(true);

      const bestResult = GameScores.getUserBestScore(testUser.id, 'brick-breaker');
      expect(bestResult.success).toBe(true);
      expect(bestResult.score.score).toBe(-50);
    });

    it('should handle special characters in gameId', () => {
      const scoreId = uniqueId();
      const result = GameScores.add(
        scoreId,
        testUser.id,
        'game-with_special.chars',
        100,
        null,
        new Date().toISOString()
      );

      expect(result.success).toBe(true);

      const scores = GameScores.getUserScores(testUser.id, 'game-with_special.chars');
      expect(scores.success).toBe(true);
      expect(scores.scores).toHaveLength(1);
    });

    it('should handle empty metadata', () => {
      const scoreId = uniqueId();
      const result = GameScores.add(
        scoreId,
        testUser.id,
        'brick-breaker',
        100,
        '',
        new Date().toISOString()
      );

      expect(result.success).toBe(true);

      const scores = GameScores.getUserScores(testUser.id, 'brick-breaker');
      expect(scores.success).toBe(true);
      expect(scores.scores[0].metadata).toBe('');
    });
  });
});
