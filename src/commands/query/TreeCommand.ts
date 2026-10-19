import { CliError } from "../../errors/CliError";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";
import { TreeRenderer } from "./TreeRenderer";

/**
 * `tree [id]` — prints the document structure with key geometry inline.
 *
 * Without argument the whole document is shown; with an id only the subtree
 * rooted at that shape. Read only: never enters the undo stack.
 */
export class TreeCommand implements Command {
  public readonly name = "tree";
  public readonly syntax = "tree [id]";
  public readonly description = "show the shape tree (optionally a subtree)";
  public readonly category = "query" as const;
  public readonly requiresDocument = true;

  private readonly renderer = new TreeRenderer();

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length > 1) {
      throw new CliError(`invalid parameters for tree (expected: ${this.syntax})`);
    }
    const document = session.document;
    return { lines: this.renderer.render(document, args[0]) };
  }
}
