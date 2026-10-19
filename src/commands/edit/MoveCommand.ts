import { CliError } from "../../errors/CliError";
import { formatNumber, parseNumber } from "../../model/NumberCodec";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `move <id> <dx> <dy>` — incremental translation.
 *
 * Leaf shapes report the resulting anchor point; containers report the delta
 * (they have no single position). The polymorphic `anchor` getter decides
 * which feedback is printed, not a type switch.
 */
export class MoveCommand implements Command {
  public readonly name = "move";
  public readonly syntax = "move <id> <dx> <dy>";
  public readonly description = "translate a shape (containers move every child)";
  public readonly category = "edit" as const;
  public readonly requiresDocument = true;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length !== 3) {
      throw new CliError(`invalid parameters for move (expected: ${this.syntax})`);
    }
    const document = session.document;
    const shape = document.requireShape(args[0]);
    const dx = parseNumber(args[1], "dx");
    const dy = parseNumber(args[2], "dy");
    const label = `${shape.type}#${shape.id}`;
    const anchorBefore = shape.anchor;

    shape.move(dx, dy);

    const anchorAfter = shape.anchor;
    if (anchorBefore === null || anchorAfter === null) {
      return {
        lines: [
          `${label} moved by (${formatNumber(dx)},${formatNumber(dy)})`,
        ],
        undoLines: [
          `${label} moved back by (${formatNumber(-dx)},${formatNumber(-dy)})`,
        ],
      };
    }
    return {
      lines: [
        `${label} moved to (${formatNumber(anchorAfter.x)},${formatNumber(anchorAfter.y)})`,
      ],
      undoLines: [
        `${label} moved back to (${formatNumber(anchorBefore.x)},${formatNumber(anchorBefore.y)})`,
      ],
    };
  }
}
