/** @type {import('jest').Config} */
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'server.js',
    'utils/**/*.js',
    '!utils/db/database.js', // Legacy/unused file
    '!utils/db/reclaim.db',
    '!**/node_modules/**'
  ],
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  // Run tests serially to avoid database conflicts
  maxWorkers: 1
};
