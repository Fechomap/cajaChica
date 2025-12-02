import { REDIS_KEYS } from './keys/redis-keys.constant.js';

import type { Redis } from 'ioredis';

const DEFAULT_TTL = 60 * 5; // 5 minutes

export class CacheService {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  // User cache
  async getUser<T>(odId: string): Promise<T | null> {
    return this.get<T>(REDIS_KEYS.CACHE.USER(odId));
  }

  async setUser<T>(odId: string, user: T, ttl?: number): Promise<void> {
    await this.set(REDIS_KEYS.CACHE.USER(odId), user, ttl);
  }

  async invalidateUser(odId: string): Promise<void> {
    await this.delete(REDIS_KEYS.CACHE.USER(odId));
  }

  // Group cache
  async getGroup<T>(groupId: string): Promise<T | null> {
    return this.get<T>(REDIS_KEYS.CACHE.GROUP(groupId));
  }

  async setGroup<T>(groupId: string, group: T, ttl?: number): Promise<void> {
    await this.set(REDIS_KEYS.CACHE.GROUP(groupId), group, ttl);
  }

  async invalidateGroup(groupId: string): Promise<void> {
    await this.delete(REDIS_KEYS.CACHE.GROUP(groupId));
  }

  // Organization cache
  async getOrganization<T>(orgId: string): Promise<T | null> {
    return this.get<T>(REDIS_KEYS.CACHE.ORGANIZATION(orgId));
  }

  async setOrganization<T>(orgId: string, org: T, ttl?: number): Promise<void> {
    await this.set(REDIS_KEYS.CACHE.ORGANIZATION(orgId), org, ttl);
  }

  async invalidateOrganization(orgId: string): Promise<void> {
    await this.delete(REDIS_KEYS.CACHE.ORGANIZATION(orgId));
  }

  // Rate limiting
  async checkRateLimit(
    odId: string,
    action: string,
    limit: number,
    windowSec: number
  ): Promise<boolean> {
    const key = REDIS_KEYS.RATE_LIMIT(odId, action);
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, windowSec);
    }

    return current <= limit;
  }

  // Distributed locks
  async acquireLock(resource: string, ttlMs: number = 10000): Promise<boolean> {
    const key = REDIS_KEYS.LOCK(resource);
    const result = await this.redis.set(key, '1', 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async releaseLock(resource: string): Promise<void> {
    const key = REDIS_KEYS.LOCK(resource);
    await this.redis.del(key);
  }
}
