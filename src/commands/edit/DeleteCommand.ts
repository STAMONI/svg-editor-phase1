import { CliError } from "../../errors/CliError";
import { Canvas } from "../../model/Canvas";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `delete <id>` — removes a shape; deleting a container removes the whole
 * subtree. One undo unit restores the complete subtree.
 */
export class DeleteCommand implements Command {
  public readonly name = "delete";
  public readonly syntax = "delete <id>";
  public readonly description = "delete a shape (a container deletes its subtree)";
  public readonly category = "edit" as const;
  public readonly requiresDocument = true;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length !== 1) {
      throw new CliError(`invalid parameters for delete (expected: ${this.syntax})`);
    }
    const document = session.document;
    const shape = document.requireShape(args[0]);
    const parent = shape.parent;
    document.detachShape(shape);
    const restoreTarget =
      parent === null || parent instanceof Canvas
        ? ""
        : ` into ${parent.type}#${parent.id}`;
    return {
      lines: [`${shape.type}#${shape.id} deleted`],
      undoLines: [`${shape.type}#${shape.id} restored${restoreTarget}`],
    };
  }
}
