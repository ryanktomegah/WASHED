export type ErrorCategory =
  | 'user_correctable'
  | 'system_recoverable'
  | 'operator_required'
  | 'catastrophic';

export interface DomainErrorOptions {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly cause?: unknown;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly userMessageKey: string;
}

export class DomainError extends Error {
  public readonly category: ErrorCategory;
  public readonly code: string;
  public readonly details: Readonly<Record<string, unknown>>;
  public readonly userMessageKey: string;

  public constructor(message: string, options: DomainErrorOptions) {
    super(message, { cause: options.cause });
    this.name = 'DomainError';
    this.category = options.category;
    this.code = options.code;
    this.details = options.details ?? {};
    this.userMessageKey = options.userMessageKey;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
