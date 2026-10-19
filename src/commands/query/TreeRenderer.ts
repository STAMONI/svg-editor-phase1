import { Container } from "../../model/Container";
import type { Shape } from "../../model/Shape";
import type { SvgDocument } from "../../model/SvgDocument";

interface TreeEntry {
  readonly prefix: string;
  readonly label: string;
  readonly description: string;
}

/**
 * Renders the document tree for the `tree` command.
 *
 * Format rules (see the assignment):
 * - the root line is `svg (WxH)`, or `type#id` for a subtree;
 * - every shape shows its key geometry inline (`x=… y=… w=… h=…`,
 *   `cx=… cy=… r=…`, `(x,y) "text"`, `(x1,y1) -> (x2,y2)`);
 * - the attribute column is aligned over the whole tree, containers show only
 *   their id (plus style attributes when set).
 */
export class TreeRenderer {
  /** @throws CliError `no such shape: <id>` for unknown subtree roots */
  public render(document: SvgDocument, rootId?: string): string[] {
    if (rootId === undefined) {
      const entries: TreeEntry[] = [];
      this.collectChildren(document.canvas, [], entries);
      return [
        `svg (${document.canvas.describeCanvasSize()})`,
        ...this.align(entries),
      ];
    }
    const root = document.requireShape(rootId);
    const entries: TreeEntry[] = [];
    if (root instanceof Container) {
      this.collectChildren(root, [], entries);
    }
    return [this.describeRoot(root), ...this.align(entries)];
  }

  private collectChildren(
    container: Container,
    ancestorIsLast: readonly boolean[],
    entries: TreeEntry[],
  ): void {
    const children = container.children;
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      const isLast = index === children.length - 1;
      const vertical = ancestorIsLast
        .map((last) => (last ? "    " : "│   "))
        .join("");
      const branch = isLast ? "└── " : "├── ";
      entries.push({
        prefix: `${vertical}${branch}`,
        label: `${child.type}#${child.id}`,
        description: child.describeInline(),
      });
      if (child instanceof Container) {
        this.collectChildren(child, [...ancestorIsLast, isLast], entries);
      }
    }
  }

  private align(entries: readonly TreeEntry[]): string[] {
    const column = entries.reduce(
      (max, entry) => Math.max(max, entry.prefix.length + entry.label.length),
      0,
    ) + 2;
    return entries.map((entry) => {
      const head = `${entry.prefix}${entry.label}`;
      if (entry.description.length === 0) {
        return head;
      }
      return `${head}${" ".repeat(column - head.length)}${entry.description}`;
    });
  }

  private describeRoot(shape: Shape): string {
    const inline = shape.describeInline();
    return inline.length === 0
      ? `${shape.type}#${shape.id}`
      : `${shape.type}#${shape.id} ${inline}`;
  }
}
