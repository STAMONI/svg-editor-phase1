import { CliError } from "../../errors/CliError";
import type { SvgReader } from "../../io/SvgReader";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `read <file.svg>` — loads an SVG file as the current document.
 *
 * Missing ids are auto assigned by the reader; each case is reported as a
 * `warning:` line before the summary. A document level command, so undo/redo
 * is disabled until the next edit.
 */
export class ReadCommand implements Command {
  public readonly name = "read";
  public readonly syntax = "read <file.svg>";
  public readonly description = "read an SVG file as the current document";
  public readonly category = "document" as const;
  public readonly requiresDocument = false;

  public constructor(private readonly reader: SvgReader) {}

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length !== 1) {
      throw new CliError(`invalid parameters for read (expected: ${this.syntax})`);
    }
    const path = args[0];
    const result = this.reader.read(path);
    session.setDocument(result.document, path);
    const lines: string[] = result.warnings.map((warning) => `warning: ${warning}`);
    lines.push(`read ${path} (${result.elementCount} elements)`);
    return { lines };
  }
}
