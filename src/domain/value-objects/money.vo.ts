import { TRANSACTION_CONSTANTS } from '../constants/index.js';
import { InvalidAmountError } from '../errors/invalid-amount.error.js';

export class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  private constructor(amount: number, currency: string) {
    this._amount = amount;
    this._currency = currency;
  }

  static create(amount: number, currency: string = 'MXN'): Money {
    if (amount < TRANSACTION_CONSTANTS.MIN_AMOUNT) {
      throw new InvalidAmountError(`Amount must be at least ${TRANSACTION_CONSTANTS.MIN_AMOUNT}`);
    }
    if (amount > TRANSACTION_CONSTANTS.MAX_AMOUNT) {
      throw new InvalidAmountError(`Amount cannot exceed ${TRANSACTION_CONSTANTS.MAX_AMOUNT}`);
    }
    if (!Number.isFinite(amount)) {
      throw new InvalidAmountError('Amount must be a finite number');
    }

    return new Money(Math.round(amount * 100) / 100, currency);
  }

  static zero(currency: string = 'MXN'): Money {
    return new Money(0, currency);
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount > other._amount;
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount < other._amount;
  }

  isZero(): boolean {
    return this._amount === 0;
  }

  isNegative(): boolean {
    return this._amount < 0;
  }

  format(): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: this._currency,
    }).format(this._amount);
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new InvalidAmountError(
        `Cannot perform operation between ${this._currency} and ${other._currency}`
      );
    }
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  toJSON(): { amount: number; currency: string } {
    return { amount: this._amount, currency: this._currency };
  }
}
