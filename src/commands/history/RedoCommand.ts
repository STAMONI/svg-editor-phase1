import { CliError } from "../../errors/CliError";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `redo` — re-applies the last undone edit unit.
 *
 * The redo stack is cleared whenever a new edit command is recorded, so a new
 * edit after an undo makes the old redo branch unavailable.
 */
export class RedoCommand implements Command {
  public readonly name = "redo";
  public readonly syntax = "redo";
  public readonly description = "redo the last undone edit command";
  public readonly category = "history" as const;
  public readonly requiresDocument = true;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length !== 0) {
      throw new CliError(`invalid parameters for redo (expected: ${this.syntax})`);
    }
    return { lines: session.redo() };
  }
}
