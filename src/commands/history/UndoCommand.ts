import { CliError } from "../../errors/CliError";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `undo` — reverts the last edit unit (snapshot restore, see UndoManager).
 *
 * History category: undo never creates a new history entry, it only moves the
 * current position. Errors: empty stack, or history locked by a document
 * level command (`undo not allowed after io command`).
 */
export class UndoCommand implements Command {
  public readonly name = "undo";
  public readonly syntax = "undo";
  public readonly description = "undo the last edit command";
  public readonly category = "history" as const;
  public readonly requiresDocument = true;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length !== 0) {
      throw new CliError(`invalid parameters for undo (expected: ${this.syntax})`);
    }
    return { lines: session.undo() };
  }
}
