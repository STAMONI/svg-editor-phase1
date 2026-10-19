import { CliError } from "../../errors/CliError";
import { formatNumber, parseNumber } from "../../model/NumberCodec";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `set <id> <attr> <value>` — sets one whitelisted attribute.
 *
 * The whitelist lives on the shape itself (`setAttribute` / `attributeValue`),
 * so this command stays type agnostic: `fill`, `stroke`, `stroke-width` and the
 * geometry attributes of the concrete type are accepted, everything else is
 * rejected with `unknown attribute: <attr>`.
 */
export class SetCommand implements Command {
  public readonly name = "set";
  public readonly syntax = "set <id> <attr> <value>";
  public readonly description = "set one whitelisted attribute of a shape";
  public readonly category = "edit" as const;
  public readonly requiresDocument = true;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length !== 3) {
      throw new CliError(`invalid parameters for set (expected: ${this.syntax})`);
    }
    const id = args[0];
    const attribute = args[1];
    const rawValue = args[2];
    const document = session.document;
    const shape = document.requireShape(id);
    // Throws `unknown attribute` before anything is mutated.
    const previousValue = shape.attributeValue(attribute);
    shape.setAttribute(attribute, rawValue);
    const label = `${shape.type}#${shape.id}`;
    return {
      lines: [
        `${label} updated: ${attribute}=${this.describeValue(attribute, rawValue)}`,
      ],
      undoLines: [
        previousValue === null
          ? `${label} updated: ${attribute}=<unset>`
          : `${label} updated: ${attribute}=${this.describeValue(attribute, previousValue)}`,
      ],
    };
  }

  /** Renders one attribute value the way the CLI echoes it. */
  private describeValue(attribute: string, value: string): string {
    if (attribute === "text") {
      return `"${value}"`;
    }
    if (attribute === "fill" || attribute === "stroke") {
      return value;
    }
    try {
      return formatNumber(parseNumber(value, attribute));
    } catch {
      return value;
    }
  }
}
