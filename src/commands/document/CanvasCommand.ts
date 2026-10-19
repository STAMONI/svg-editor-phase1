import { CliError } from "../../errors/CliError";
import {
  formatNumber,
  parsePositiveNumber,
} from "../../model/NumberCodec";
import type { Command, CommandCategory, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `canvas [w] [h]` — shows the canvas size, or resizes the canvas.
 *
 * The classification depends on the arguments: a query (no arguments) must not
 * touch the history, while a resize is a document level command that disables
 * undo/redo until the next edit.
 */
export class CanvasCommand implements Command {
  public readonly name = "canvas";
  public readonly syntax = "canvas [w] [h]";
  public readonly description = "show the canvas size, or resize the canvas";
  public readonly category = "query" as const;
  public readonly requiresDocument = true;

  public categoryFor(args: readonly string[]): CommandCategory {
    return args.length === 0 ? "query" : "document";
  }

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    const document = session.document;
    if (args.length === 0) {
      return { lines: [`canvas ${document.canvas.describeCanvasSize()}`] };
    }
    if (args.length !== 2) {
      throw new CliError(`invalid parameters for canvas (expected: ${this.syntax})`);
    }
    const width = parsePositiveNumber(args[0], "width");
    const height = parsePositiveNumber(args[1], "height");
    document.setSize(width, height);
    return {
      lines: [`canvas resized to ${formatNumber(width)}x${formatNumber(height)}`],
    };
  }
}
