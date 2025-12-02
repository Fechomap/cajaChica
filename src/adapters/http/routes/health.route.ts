import { Hono } from 'hono';

export const healthRoute = new Hono();

healthRoute.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

healthRoute.get('/ready', async (c) => {
  // Add health checks here (DB, Redis, etc.)
  return c.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});
