import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables before any import
beforeAll(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token');
  vi.stubEnv('REDIS_HOST', 'localhost');
  vi.stubEnv('REDIS_PORT', '6379');
  vi.stubEnv('LOG_LEVEL', 'error');
  vi.stubEnv('PORT', '3000');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

// Suppress console output during tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
