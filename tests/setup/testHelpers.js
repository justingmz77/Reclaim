const request = require('supertest');

/**
 * Helper to create an authenticated agent (maintains session)
 */
async function createAuthenticatedAgent(app, user) {
  const agent = request.agent(app);

  await agent
    .post('/api/login')
    .send({
      email: user.email,
      password: user.plainPassword
    })
    .expect(200);

  return agent;
}

/**
 * Helper to generate valid test data
 */
const testDataGenerators = {
  moodEntry: (overrides = {}) => ({
    date: overrides.date || new Date().toISOString().split('T')[0],
    mood: overrides.mood || 'good',
    emoji: overrides.emoji || '😊',
    note: overrides.note || 'Test note'
  }),

  journalEntry: (overrides = {}) => ({
    title: overrides.title || 'Test Journal Entry',
    content: overrides.content || 'This is test content for the journal entry.'
  }),

  habit: (overrides = {}) => ({
    name: overrides.name || 'Test Habit',
    description: overrides.description || 'Test habit description',
    reminderFrequency: overrides.reminderFrequency || 'daily'
  }),

  gameScore: (overrides = {}) => ({
    gameId: overrides.gameId || 'brick-breaker',
    score: overrides.score || 100,
    metadata: overrides.metadata || null
  })
};

/**
 * Helper to validate API response structure
 */
function expectSuccessResponse(response) {
  expect(response.body).toHaveProperty('success', true);
}

function expectErrorResponse(response, expectedError) {
  expect(response.body).toHaveProperty('error');
  if (expectedError) {
    expect(response.body.error).toContain(expectedError);
  }
}

module.exports = {
  createAuthenticatedAgent,
  testDataGenerators,
  expectSuccessResponse,
  expectErrorResponse
};
