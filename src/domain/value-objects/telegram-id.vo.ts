import { InvalidTelegramIdError } from '../errors/invalid-telegram-id.error.js';

export class TelegramId {
  private readonly _value: bigint;

  private constructor(value: bigint) {
    this._value = value;
  }

  static create(value: bigint | number | string): TelegramId {
    let bigIntValue: bigint;

    try {
      bigIntValue = BigInt(value);
    } catch {
      throw new InvalidTelegramIdError(`Invalid Telegram ID: ${value}`);
    }

    // Telegram IDs: usuarios son positivos, grupos/supergrupos son negativos
    if (bigIntValue === 0n) {
      throw new InvalidTelegramIdError('Telegram ID cannot be zero');
    }

    return new TelegramId(bigIntValue);
  }

  get value(): bigint {
    return this._value;
  }

  toString(): string {
    return this._value.toString();
  }

  toNumber(): number {
    return Number(this._value);
  }

  equals(other: TelegramId): boolean {
    return this._value === other._value;
  }

  toJSON(): string {
    return this.toString();
  }
}
