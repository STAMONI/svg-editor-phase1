/**
 * The single error type that carries user facing messages.
 *
 * Every command validates its input and throws `CliError` for recoverable
 * problems. The REPL prints the message with the `error:` prefix, so the
 * message itself never contains that prefix.
 */
export class CliError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

/** Normalizes an unknown thrown value into a CliError. */
export function asCliError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }
  if (error instanceof Error) {
    return new CliError(error.message);
  }
  return new CliError(String(error));
}
