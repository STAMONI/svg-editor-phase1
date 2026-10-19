import { CliError } from "../../errors/CliError";
import { Container } from "../../model/Container";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `addto <gid> <id>` — moves an existing shape into a container as its last
 * child. Rejects cycles (moving a container into its own descendant).
 */
export class AddToCommand implements Command {
  public readonly name = "addto";
  public readonly syntax = "addto <gid> <id>";
  public readonly description = "move an existing shape into a container";
  public readonly category = "edit" as const;
  public readonly requiresDocument = true;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length !== 2) {
      throw new CliError(`invalid parameters for addto (expected: ${this.syntax})`);
    }
    const document = session.document;
    const container = document.requireContainer(args[0]);
    const shape = document.requireShape(args[1]);
    if (shape instanceof Container && shape.containsShape(container)) {
      throw new CliError(
        `cannot add a container into its own descendant: ${shape.id}`,
      );
    }
    document.relocateShape(shape, container);
    return {
      lines: [`${shape.type}#${shape.id} added to g#${container.id}`],
      undoLines: [`${shape.type}#${shape.id} removed from g#${container.id}`],
    };
  }
}
