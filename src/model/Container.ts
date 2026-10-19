import { CliError } from "../errors/CliError";
import { Shape } from "./Shape";
import type { AttributeEntry } from "./Shape";

/**
 * Composite node: a shape that owns children.
 *
 * `move` / `scale` are recursively delegated to the children, so a container
 * behaves exactly like a leaf from the point of view of the command layer.
 * Child order is the z-order and is preserved by every operation.
 */
export abstract class Container extends Shape {
  private readonly childShapes: Shape[] = [];

  /** Children in z-order (first = bottom). */
  public get children(): readonly Shape[] {
    return this.childShapes;
  }

  /** Containers have no single anchor point. */
  public override get anchor(): null {
    return null;
  }

  /**
   * Extension point for plugin composite shapes (`box` in the next phase):
   * such a shape is a container whose internal structure is owned by the
   * plugin, so `ungroup` must refuse to dissolve it. Plain `g` returns false.
   */
  public get isPluginComposite(): boolean {
    return false;
  }

  public override move(dx: number, dy: number): void {
    for (const child of this.childShapes) {
      child.move(dx, dy);
    }
  }

  public override scale(factor: number): void {
    for (const child of this.childShapes) {
      child.scale(factor);
    }
  }

  public override findInSubtree(id: string): Shape | null {
    if (this.id === id) {
      return this;
    }
    for (const child of this.childShapes) {
      const found = child.findInSubtree(id);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }

  /** Index of `shape` among the direct children, or -1. */
  public childIndex(shape: Shape): number {
    return this.childShapes.indexOf(shape);
  }

  /** Appends a detached shape as the last (top most) child. */
  public appendShape(shape: Shape): void {
    this.insertShapeAt(this.childShapes.length, shape);
  }

  /** Inserts a detached shape at `index` of the child list. */
  public insertShapeAt(index: number, shape: Shape): void {
    if (shape.parent !== null) {
      throw new CliError(`shape is already attached: ${shape.id}`);
    }
    if (index < 0 || index > this.childShapes.length) {
      throw new CliError(`container index out of range: ${index}`);
    }
    shape.attachToParent(this);
    this.childShapes.splice(index, 0, shape);
  }

  /** Removes and returns the child at `index`, detaching it. */
  public removeShapeAt(index: number): Shape {
    const removed = this.childShapes[index];
    this.childShapes.splice(index, 1);
    removed.attachToParent(null);
    return removed;
  }

  /** Removes a direct child and returns its former index. */
  public detachShape(shape: Shape): number {
    const index = this.childShapes.indexOf(shape);
    if (index < 0) {
      throw new CliError(`shape is not a child of ${this.id}: ${shape.id}`);
    }
    this.removeShapeAt(index);
    return index;
  }

  /** True when `candidate` is this container or a descendant of it. */
  public containsShape(candidate: Shape): boolean {
    return this === candidate || this.isAncestorOf(candidate);
  }

  /** True when `candidate` is a strict descendant of this container. */
  public isAncestorOf(candidate: Shape): boolean {
    let current = candidate.parent;
    while (current !== null) {
      if (current === this) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  protected override describeGeometry(): string {
    return "";
  }

  protected override geometryEntries(): AttributeEntry[] {
    return [];
  }

  protected override cloneShape(): Container {
    const copy = this.createEmptyContainer();
    for (const child of this.childShapes) {
      copy.appendShape(child.clone());
    }
    return copy;
  }

  /** Creates an empty copy of the same concrete container type. */
  protected abstract createEmptyContainer(): Container;
}
