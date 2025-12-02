/**
 * Interface for logging abstraction.
 * This allows the application layer to depend on an abstraction
 * instead of the concrete Pino implementation.
 */
export interface ILogger {
  info(obj: object, msg?: string): void;
  info(msg: string): void;
  error(obj: object, msg?: string): void;
  error(msg: string): void;
  warn(obj: object, msg?: string): void;
  warn(msg: string): void;
  debug(obj: object, msg?: string): void;
  debug(msg: string): void;
  child(bindings: object): ILogger;
}
