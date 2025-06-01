// tests/setup.js
require('dotenv').config({ path: '.env' });

// Setup global test environment
process.env.NODE_ENV = 'test';

// Increase timeout for database operations
jest.setTimeout(30000);