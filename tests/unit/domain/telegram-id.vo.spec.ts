import { describe, it, expect } from 'vitest';
import { TelegramId } from '../../../src/domain/value-objects/telegram-id.vo.js';
import { InvalidTelegramIdError } from '../../../src/domain/errors/invalid-telegram-id.error.js';

describe('TelegramId Value Object', () => {
  describe('create', () => {
    it('should create from number', () => {
      const id = TelegramId.create(123456789);
      expect(id.value).toBe(123456789n);
    });

    it('should create from string', () => {
      const id = TelegramId.create('123456789');
      expect(id.value).toBe(123456789n);
    });

    it('should create from bigint', () => {
      const id = TelegramId.create(123456789n);
      expect(id.value).toBe(123456789n);
    });

    it('should throw error for zero', () => {
      expect(() => TelegramId.create(0)).toThrow(InvalidTelegramIdError);
    });

    it('should accept negative ids (groups/supergroups)', () => {
      // Telegram groups and supergroups have negative IDs
      const id = TelegramId.create(-1001234567890);
      expect(id.value).toBe(-1001234567890n);
      expect(id.toNumber()).toBe(-1001234567890);
    });

    it('should throw error for invalid string', () => {
      expect(() => TelegramId.create('invalid')).toThrow(InvalidTelegramIdError);
    });
  });

  describe('toString', () => {
    it('should convert to string', () => {
      const id = TelegramId.create(123456789);
      expect(id.toString()).toBe('123456789');
    });
  });

  describe('toNumber', () => {
    it('should convert to number', () => {
      const id = TelegramId.create(123456789);
      expect(id.toNumber()).toBe(123456789);
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      const a = TelegramId.create(123456789);
      const b = TelegramId.create(123456789);
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different values', () => {
      const a = TelegramId.create(123456789);
      const b = TelegramId.create(987654321);
      expect(a.equals(b)).toBe(false);
    });
  });
});
