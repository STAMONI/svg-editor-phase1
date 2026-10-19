import { CliError } from "../../errors/CliError";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/** `back <id>` — moves a shape to the bottom of its sibling z-order. */
export class BackCommand implements Command {
  public readonly name = "back";
  public readonly syntax = "back <id>";
  public readonly description = "move a shape to the back of its siblings";
  public readonly category = "edit" as const;
  public readonly requiresDocument = true;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length !== 1) {
      throw new CliError(`invalid parameters for back (expected: ${this.syntax})`);
    }
    const document = session.document;
    const shape = document.requireShape(args[0]);
    const parent = shape.parent;
    if (parent === null) {
      throw new CliError(`shape is not attached: ${shape.id}`);
    }
    parent.detachShape(shape);
    parent.insertShapeAt(0, shape);
    return {
      lines: [`${shape.type}#${shape.id} moved to back`],
      undoLines: [`${shape.type}#${shape.id} z-order restored`],
    };
  }
}
