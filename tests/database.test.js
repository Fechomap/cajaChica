// tests/database.test.js
const { PrismaClient } = require('@prisma/client');

describe('Database Connection Tests', () => {
  let prisma;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should connect to PostgreSQL', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result[0].test).toBe(1);
  });

  test('should have correct tables', async () => {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const tableNames = tables.map(t => t.table_name);
    
    expect(tableNames).toContain('Organization');
    expect(tableNames).toContain('User');
    expect(tableNames).toContain('Group');
    expect(tableNames).toContain('Transaction');
  });

  test('should have migrated data', async () => {
    const organizationCount = await prisma.organization.count();
    const userCount = await prisma.user.count();
    const groupCount = await prisma.group.count();
    
    expect(organizationCount).toBeGreaterThan(0);
    expect(userCount).toBeGreaterThan(0);
    expect(groupCount).toBeGreaterThan(0);
  });
});