import { CliError } from "../../errors/CliError";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/** `front <id>` — moves a shape to the top of its sibling z-order. */
export class FrontCommand implements Command {
  public readonly name = "front";
  public readonly syntax = "front <id>";
  public readonly description = "move a shape to the front of its siblings";
  public readonly category = "edit" as const;
  public readonly requiresDocument = true;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length !== 1) {
      throw new CliError(`invalid parameters for front (expected: ${this.syntax})`);
    }
    const document = session.document;
    const shape = document.requireShape(args[0]);
    const parent = shape.parent;
    if (parent === null) {
      throw new CliError(`shape is not attached: ${shape.id}`);
    }
    parent.detachShape(shape);
    parent.appendShape(shape);
    return {
      lines: [`${shape.type}#${shape.id} moved to front`],
      undoLines: [`${shape.type}#${shape.id} z-order restored`],
    };
  }
}
