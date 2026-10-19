import { CliError } from "../../errors/CliError";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";
import type { ShapeFactory } from "../factories/ShapeFactory";

/**
 * `create <type> <id> [params…]` — creates a shape in the current document.
 *
 * Argument validation is delegated to ShapeFactory, id uniqueness to
 * SvgDocument; the command itself only sequences the steps.
 */
export class CreateCommand implements Command {
  public readonly name = "create";
  public readonly syntax = "create <type> <id> [params…] [in <containerId>]";
  public readonly description = "create a shape (rect/circle/ellipse/line/text/g)";
  public readonly category = "edit" as const;
  public readonly requiresDocument = true;

  public constructor(private readonly factory: ShapeFactory) {}

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length < 2) {
      throw new CliError(`invalid parameters for create (expected: ${this.syntax})`);
    }
    const typeName = args[0];
    const id = args[1];
    const params = args.slice(2);
    const document = session.document;
    document.assertIdAvailable(id);
    const shape = this.factory.create(typeName, id, params);
    document.attachShape(shape, null);
    return {
      lines: [`${shape.type}#${shape.id} created`],
      undoLines: [`${shape.type}#${shape.id} removed`],
    };
  }
}
