const path = require('path');

// Set test environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.TEST_DB_PATH = path.join(__dirname, '../../utils/db/test.db');

// Silence console output during tests for cleaner output
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Increase timeout for database operations
jest.setTimeout(10000);
