import { CliError } from "../../errors/CliError";
import { Canvas } from "../../model/Canvas";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `show <id>` — attribute details of one shape:
 * a header with the parent id followed by indented attribute groups.
 */
export class ShowCommand implements Command {
  public readonly name = "show";
  public readonly syntax = "show <id>";
  public readonly description = "show the attributes of one shape";
  public readonly category = "query" as const;
  public readonly requiresDocument = true;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length !== 1) {
      throw new CliError(`invalid parameters for show (expected: ${this.syntax})`);
    }
    const document = session.document;
    const shape = document.requireShape(args[0]);
    const parent = shape.parent;
    const parentLabel =
      parent === null || parent instanceof Canvas
        ? "svg"
        : `${parent.type}#${parent.id}`;
    const lines = [
      `${shape.type}#${shape.id}  parent=${parentLabel}`,
      ...shape.describeDetails().map((line) => `  ${line}`),
    ];
    return { lines };
  }
}
