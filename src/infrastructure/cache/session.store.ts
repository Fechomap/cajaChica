import { REDIS_KEYS } from './keys/redis-keys.constant.js';

import type { Redis } from 'ioredis';

const SESSION_TTL = 60 * 60 * 24; // 24 hours

export interface SessionData {
  odId: string;
  platform: string;
  state: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class SessionStore {
  constructor(private readonly redis: Redis) {}

  async get(platform: string, odId: string): Promise<SessionData | null> {
    const key = REDIS_KEYS.SESSION(platform, odId);
    const value = await this.redis.get(key);
    return value ? (JSON.parse(value) as SessionData) : null;
  }

  async set(platform: string, odId: string, data: Partial<SessionData>): Promise<void> {
    const key = REDIS_KEYS.SESSION(platform, odId);
    const existing = await this.get(platform, odId);

    const session: SessionData = {
      odId,
      platform,
      state: data.state ?? existing?.state ?? 'idle',
      data: { ...existing?.data, ...data.data },
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.redis.setex(key, SESSION_TTL, JSON.stringify(session));
  }

  async delete(platform: string, odId: string): Promise<void> {
    const key = REDIS_KEYS.SESSION(platform, odId);
    await this.redis.del(key);
  }

  async getState(platform: string, odId: string): Promise<string> {
    const session = await this.get(platform, odId);
    return session?.state ?? 'idle';
  }

  async setState(platform: string, odId: string, state: string): Promise<void> {
    await this.set(platform, odId, { state });
  }

  async getData<T = unknown>(platform: string, odId: string, key: string): Promise<T | undefined> {
    const session = await this.get(platform, odId);
    return session?.data[key] as T | undefined;
  }

  async setData(platform: string, odId: string, key: string, value: unknown): Promise<void> {
    const session = await this.get(platform, odId);
    const data = { ...session?.data, [key]: value };
    await this.set(platform, odId, { data });
  }
}
