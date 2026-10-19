import type { EditorSession } from "./EditorSession";

/**
 * How a command affects the document / history:
 * - `document`: replaces or re-baselines the document (init / read / save / canvas)
 * - `edit`: mutates the document, therefore one undo unit
 * - `query`: read only, never enters the undo stack
 * - `history`: undo / redo themselves
 */
export type CommandCategory = "document" | "edit" | "query" | "history";

/** Output of one command: feedback lines plus optional undo feedback. */
export interface CommandResult {
  /** Lines printed on success. */
  readonly lines: readonly string[];
  /** Lines printed when this command is undone (edit commands only). */
  readonly undoLines?: readonly string[];
}

/**
 * Command pattern interface.
 *
 * A command only validates arguments and orchestrates domain objects. The
 * invoker (EditorSession) is responsible for snapshots, rollback and history,
 * so concrete commands never implement inverse operations themselves.
 */
export interface Command {
  /** Command word used by the dispatcher. */
  readonly name: string;
  /** One line syntax shown by `help`. */
  readonly syntax: string;
  /** One line description shown by `help`. */
  readonly description: string;
  /** Document / edit / query / history classification. */
  readonly category: CommandCategory;
  /** When true a document must exist before the command runs. */
  readonly requiresDocument: boolean;
  /** Executes the command; throws CliError on validation failures. */
  run(args: readonly string[], session: EditorSession): CommandResult;
}
