import { CliError } from "../../errors/CliError";
import { formatNumber, parseNumber } from "../../model/NumberCodec";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `scale <id> <factor>` — multiplies every geometry attribute by `factor`.
 *
 * The factor must be strictly positive. Containers recurse into their
 * descendants through the Composite base class; leaves scale their own fields.
 */
export class ScaleCommand implements Command {
  public readonly name = "scale";
  public readonly syntax = "scale <id> <factor>";
  public readonly description = "scale a shape's geometry (containers scale every child)";
  public readonly category = "edit" as const;
  public readonly requiresDocument = true;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length !== 2) {
      throw new CliError(`invalid parameters for scale (expected: ${this.syntax})`);
    }
    const document = session.document;
    const shape = document.requireShape(args[0]);
    const factor = parseNumber(args[1], "factor");
    if (!(factor > 0)) {
      throw new CliError("scale factor must be positive");
    }
    shape.scale(factor);
    const label = `${shape.type}#${shape.id}`;
    return {
      lines: [`${label} scaled by ${formatNumber(factor)}`],
      undoLines: [`${label} scaled back`],
    };
  }
}
