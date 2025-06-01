// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/bot.js', // Excluir configuración del bot
    '!src/lib/prisma.js'  // Excluir configuración de Prisma
  ],
  verbose: true
};