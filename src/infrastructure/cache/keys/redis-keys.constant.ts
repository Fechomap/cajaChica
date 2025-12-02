export const REDIS_KEYS = {
  SESSION: (platform: string, odId: string) => `session:${platform}:${odId}` as const,

  CACHE: {
    USER: (odId: string) => `cache:user:${odId}` as const,
    GROUP: (groupId: string) => `cache:group:${groupId}` as const,
    CONFIG: (key: string) => `cache:config:${key}` as const,
    ORGANIZATION: (orgId: string) => `cache:org:${orgId}` as const,
  },

  RATE_LIMIT: (odId: string, action: string) => `ratelimit:${action}:${odId}` as const,

  LOCK: (resource: string) => `lock:${resource}` as const,

  FSM_STATE: (platform: string, odId: string) => `fsm:${platform}:${odId}` as const,

  CHANNEL: {
    NOTIFICATIONS: 'channel:notifications' as const,
    EVENTS: 'channel:events' as const,
  },
} as const;
