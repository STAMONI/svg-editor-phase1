import { CliError } from "../../errors/CliError";
import { formatNumber, parsePositiveNumber } from "../../model/NumberCodec";
import { SvgDocument } from "../../model/SvgDocument";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/** Default canvas size of `init` without arguments. */
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

/**
 * `init [w] [h]` — creates a new empty document (default 800x600).
 *
 * A document level command: it replaces the current document and therefore
 * resets the undo history (see EditorSession / UndoManager in the undo stage).
 */
export class InitCommand implements Command {
  public readonly name = "init";
  public readonly syntax = "init [w] [h]";
  public readonly description = "create a new empty canvas (default 800x600)";
  public readonly category = "document" as const;
  public readonly requiresDocument = false;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length > 2) {
      throw new CliError(`invalid parameters for init (expected: ${this.syntax})`);
    }
    const width =
      args[0] === undefined ? DEFAULT_WIDTH : parsePositiveNumber(args[0], "width");
    const height =
      args[1] === undefined ? DEFAULT_HEIGHT : parsePositiveNumber(args[1], "height");
    const document = new SvgDocument(width, height);
    session.setDocument(document, null);
    return {
      lines: [
        `canvas ${formatNumber(width)}x${formatNumber(height)} created`,
      ],
    };
  }
}
