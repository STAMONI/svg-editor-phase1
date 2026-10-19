import { CliError } from "../../errors/CliError";
import { Canvas } from "../../model/Canvas";
import { Container } from "../../model/Container";
import type { Command, CommandResult } from "../Command";
import type { EditorSession } from "../EditorSession";

/**
 * `ungroup <gid>` — dissolves a container, promoting its children into the
 * container's parent at the container's former position (z-order preserved).
 *
 * Rejected cases: a leaf (not a container), a top level container (its parent
 * is the canvas root) and plugin composites whose internal structure is owned
 * by the plugin.
 */
export class UngroupCommand implements Command {
  public readonly name = "ungroup";
  public readonly syntax = "ungroup <gid>";
  public readonly description = "dissolve a g container into its parent";
  public readonly category = "edit" as const;
  public readonly requiresDocument = true;

  public run(
    args: readonly string[],
    session: EditorSession,
  ): CommandResult {
    if (args.length !== 1) {
      throw new CliError(`invalid parameters for ungroup (expected: ${this.syntax})`);
    }
    const document = session.document;
    const shape = document.requireShape(args[0]);
    if (!(shape instanceof Container)) {
      throw new CliError(`not a container: ${shape.id}`);
    }
    if (shape.isPluginComposite) {
      throw new CliError(`cannot ungroup composite shape: ${shape.id}`);
    }
    const parent = shape.parent;
    if (parent === null || parent instanceof Canvas) {
      throw new CliError(`cannot ungroup top-level container: ${shape.id}`);
    }
    const insertionIndex = parent.childIndex(shape);
    const childCount = shape.children.length;
    const children = [...shape.children];

    parent.detachShape(shape);
    for (let offset = 0; offset < children.length; offset += 1) {
      const child = shape.removeShapeAt(0);
      parent.insertShapeAt(insertionIndex + offset, child);
    }

    return {
      lines: [`g#${shape.id} ungrouped (${childCount} children)`],
      undoLines: [`g#${shape.id} regrouped`],
    };
  }
}
