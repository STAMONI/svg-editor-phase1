import { CliError } from "../../errors/CliError";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";
import type { ShapeFactory } from "../factories/ShapeFactory";

/**
 * Parsed form of the optional trailing `in <containerId>` clause.
 */
interface CreateArguments {
  readonly params: readonly string[];
  readonly containerId: string | null;
}

/**
 * `create <type> <id> [params…] [in <containerId>]` — creates a shape either
 * at the canvas root or directly inside an existing `g` container.
 *
 * `in` attaches the shape at creation time, which is the preferred way to
 * express hierarchy; `group` (adopt existing shapes) and `addto` (move an
 * existing shape) cover the other two timings.
 *
 * Argument validation is delegated to ShapeFactory, id uniqueness and parent
 * validation to SvgDocument; the command itself only sequences the steps, so a
 * failed create cannot leave a partial shape behind.
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
    const parsed = CreateCommand.splitInClause(args.slice(2));

    const document = session.document;
    document.assertIdAvailable(id);
    const parent =
      parsed.containerId === null
        ? null
        : document.requireContainer(parsed.containerId);
    const shape = this.factory.create(typeName, id, parsed.params);
    document.attachShape(shape, parent);

    const target = parent === null ? "" : ` in ${parent.type}#${parent.id}`;
    return {
      lines: [`${shape.type}#${shape.id} created${target}`],
      undoLines: [`${shape.type}#${shape.id} removed`],
    };
  }

  /** Splits a trailing `in <containerId>` pair off the parameter tokens. */
  private static splitInClause(rest: readonly string[]): CreateArguments {
    if (rest.length >= 2 && rest[rest.length - 2] === "in") {
      return {
        params: rest.slice(0, rest.length - 2),
        containerId: rest[rest.length - 1],
      };
    }
    return { params: rest, containerId: null };
  }
}
