import { CliError } from "../../errors/CliError";
import type { SvgWriter } from "../../io/SvgWriter";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `save [file.svg]` — writes the current document as SVG.
 *
 * Without an argument the file last read from / saved to is used. Saving is a
 * document level command: undo/redo is disabled until the next edit.
 */
export class SaveCommand implements Command {
  public readonly name = "save";
  public readonly syntax = "save [file.svg]";
  public readonly description = "save the current document as SVG";
  public readonly category = "document" as const;
  public readonly requiresDocument = true;

  public constructor(private readonly writer: SvgWriter) {}

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length > 1) {
      throw new CliError(`invalid parameters for save (expected: ${this.syntax})`);
    }
    const path = args[0] ?? session.currentPath;
    if (path === null) {
      throw new CliError("no file to save (use 'save <file.svg>')");
    }
    const document = session.document;
    this.writer.write(path, document);
    session.setDocument(document, path);
    return {
      lines: [`saved to ${path} (${document.elementCount()} elements)`],
    };
  }
}
