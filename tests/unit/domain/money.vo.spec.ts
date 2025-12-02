import { describe, it, expect } from 'vitest';
import { Money } from '../../../src/domain/value-objects/money.vo.js';
import { InvalidAmountError } from '../../../src/domain/errors/invalid-amount.error.js';

describe('Money Value Object', () => {
  describe('create', () => {
    it('should create money with valid amount', () => {
      const money = Money.create(100.5);
      expect(money.amount).toBe(100.5);
      expect(money.currency).toBe('MXN');
    });

    it('should create money with custom currency', () => {
      const money = Money.create(50, 'USD');
      expect(money.currency).toBe('USD');
    });

    it('should throw error for negative amount', () => {
      expect(() => Money.create(-10)).toThrow(InvalidAmountError);
    });

    it('should throw error for amount exceeding max', () => {
      expect(() => Money.create(9999999999999)).toThrow(InvalidAmountError);
    });

    it('should round to 2 decimal places', () => {
      const money = Money.create(100.999);
      expect(money.amount).toBe(101);
    });
  });

  describe('zero', () => {
    it('should create zero money', () => {
      const money = Money.zero();
      expect(money.amount).toBe(0);
      expect(money.isZero()).toBe(true);
    });
  });

  describe('add', () => {
    it('should add two money values', () => {
      const a = Money.create(100);
      const b = Money.create(50);
      const result = a.add(b);
      expect(result.amount).toBe(150);
    });

    it('should throw error when adding different currencies', () => {
      const a = Money.create(100, 'MXN');
      const b = Money.create(50, 'USD');
      expect(() => a.add(b)).toThrow(InvalidAmountError);
    });
  });

  describe('subtract', () => {
    it('should subtract two money values', () => {
      const a = Money.create(100);
      const b = Money.create(30);
      const result = a.subtract(b);
      expect(result.amount).toBe(70);
    });

    it('should allow negative result', () => {
      const a = Money.create(30);
      const b = Money.create(100);
      const result = a.subtract(b);
      expect(result.amount).toBe(-70);
      expect(result.isNegative()).toBe(true);
    });
  });

  describe('comparisons', () => {
    it('should compare greater than', () => {
      const a = Money.create(100);
      const b = Money.create(50);
      expect(a.isGreaterThan(b)).toBe(true);
      expect(b.isGreaterThan(a)).toBe(false);
    });

    it('should compare less than', () => {
      const a = Money.create(50);
      const b = Money.create(100);
      expect(a.isLessThan(b)).toBe(true);
    });

    it('should check equality', () => {
      const a = Money.create(100);
      const b = Money.create(100);
      expect(a.equals(b)).toBe(true);
    });
  });

  describe('format', () => {
    it('should format money as currency string', () => {
      const money = Money.create(1234.56);
      const formatted = money.format();
      expect(formatted).toContain('1,234.56');
    });
  });
});
