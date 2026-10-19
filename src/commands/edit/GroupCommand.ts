import { CliError } from "../../errors/CliError";
import { Container } from "../../model/Container";
import { Group } from "../../model/Group";
import type { Shape } from "../../model/Shape";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `group <newGid> <id1> <id2>…` — creates a container and moves the given
 * shapes into it (removing them from their former parents, preserving the
 * order given on the command line).
 *
 * The new container is inserted where the first grouped shape used to be.
 * Grouping a container together with one of its own descendants is rejected.
 */
export class GroupCommand implements Command {
  public readonly name = "group";
  public readonly syntax = "group <newGid> <id1> <id2>…";
  public readonly description = "create a g container holding the given shapes";
  public readonly category = "edit" as const;
  public readonly requiresDocument = true;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length < 3) {
      throw new CliError(`invalid parameters for group (expected: ${this.syntax})`);
    }
    const newGid = args[0];
    const ids = args.slice(1);
    const document = session.document;
    document.assertIdAvailable(newGid);

    this.assertNoDuplicates(ids);
    const shapes = ids.map((id) => document.requireShape(id));
    this.assertNoAncestorConflict(shapes);

    const firstShape = shapes[0];
    const parent = firstShape.parent;
    if (parent === null) {
      throw new CliError(`shape is not attached: ${firstShape.id}`);
    }
    const insertionIndex = parent.childIndex(firstShape);

    const group = new Group(newGid);
    document.attachShape(group, parent, insertionIndex);
    for (const shape of shapes) {
      document.detachShape(shape);
      group.appendShape(shape);
    }

    return {
      lines: [`g#${group.id} created with ${shapes.length} children`],
      undoLines: [`g#${group.id} dissolved`],
    };
  }

  private assertNoDuplicates(ids: readonly string[]): void {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        throw new CliError(`duplicate shape in group: ${id}`);
      }
      seen.add(id);
    }
  }

  private assertNoAncestorConflict(shapes: readonly Shape[]): void {
    for (const candidate of shapes) {
      if (!(candidate instanceof Container)) {
        continue;
      }
      for (const other of shapes) {
        if (candidate !== other && candidate.isAncestorOf(other)) {
          throw new CliError(
            `cannot group a container into its own descendant: ${candidate.id}`,
          );
        }
      }
    }
  }
}
