import { CliError } from "../../errors/CliError";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `exit` — convenience command that leaves the REPL.
 *
 * Not part of the assignment command table; it only makes the CLI usable
 * without closing the terminal. `quit` is registered as an alias.
 */
export class ExitCommand implements Command {
  public readonly name = "exit";
  public readonly syntax = "exit";
  public readonly description = "leave the REPL";
  public readonly category = "query" as const;
  public readonly requiresDocument = false;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length !== 0) {
      throw new CliError(`invalid parameters for exit (expected: ${this.syntax})`);
    }
    session.requestExit();
    return { lines: [] };
  }
}
