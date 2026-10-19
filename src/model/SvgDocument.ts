import { CliError } from "../errors/CliError";
import { Canvas } from "./Canvas";
import { Container } from "./Container";
import type { Shape } from "./Shape";

/**
 * Aggregate root of the editor: owns the canvas and all shapes.
 *
 * Every tree mutation goes through this class, which keeps the global id
 * uniqueness invariant (ids are unique and case sensitive across the whole
 * document). Commands therefore never manipulate parent links directly.
 */
export class SvgDocument {
  private readonly canvasInstance: Canvas;

  public constructor(width: number, height: number) {
    this.canvasInstance = new Canvas(width, height);
  }

  public get width(): number {
    return this.canvasInstance.width;
  }

  public get height(): number {
    return this.canvasInstance.height;
  }

  /** The `<svg>` root (children are the top level shapes). */
  public get canvas(): Canvas {
    return this.canvasInstance;
  }

  /** Changes the canvas size; both dimensions must be strictly positive. */
  public setSize(width: number, height: number): void {
    this.canvasInstance.setSize(width, height);
  }

  /** Looks a shape up by id; the canvas itself is not addressable. */
  public findShape(id: string): Shape | null {
    for (const child of this.canvasInstance.children) {
      const found = child.findInSubtree(id);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }

  /** @throws CliError `no such shape: <id>` */
  public requireShape(id: string): Shape {
    const shape = this.findShape(id);
    if (shape === null) {
      throw new CliError(`no such shape: ${id}`);
    }
    return shape;
  }

  /** @throws CliError `no such container: <id>` / `not a container: <id>` */
  public requireContainer(id: string): Container {
    const shape = this.findShape(id);
    if (shape === null) {
      throw new CliError(`no such container: ${id}`);
    }
    if (!(shape instanceof Container)) {
      throw new CliError(`not a container: ${id}`);
    }
    return shape;
  }

  /** @throws CliError `id already exists: <id>` */
  public assertIdAvailable(id: string): void {
    if (this.findShape(id) !== null) {
      throw new CliError(`id already exists: ${id}`);
    }
  }

  /** Attaches a new shape below `parent` (root when `null`). */
  public attachShape(shape: Shape, parent: Container | null, index?: number): void {
    this.assertIdAvailable(shape.id);
    const target = parent ?? this.canvasInstance;
    if (index === undefined) {
      target.appendShape(shape);
    } else {
      target.insertShapeAt(index, shape);
    }
  }

  /** Moves an already attached shape to a new parent (id is not re-checked). */
  public relocateShape(shape: Shape, parent: Container | null, index?: number): void {
    const source = shape.parent;
    if (source !== null) {
      source.detachShape(shape);
    }
    const target = parent ?? this.canvasInstance;
    if (index === undefined) {
      target.appendShape(shape);
    } else {
      target.insertShapeAt(index, shape);
    }
  }

  /** Detaches a shape from the tree (children stay attached to it). */
  public detachShape(shape: Shape): void {
    if (shape.parent === null) {
      throw new CliError(`shape is not attached: ${shape.id}`);
    }
    shape.parent.detachShape(shape);
  }

  /** Number of shapes in the document, excluding the canvas element. */
  public elementCount(): number {
    return countDescendants(this.canvasInstance);
  }

  /** Deep copy used by the undo manager (Memento). */
  public snapshot(): SvgDocument {
    const copy = new SvgDocument(this.width, this.height);
    for (const child of this.canvasInstance.children) {
      copy.canvas.appendShape(child.clone());
    }
    return copy;
  }
}

function countDescendants(container: Container): number {
  let total = 0;
  for (const child of container.children) {
    total += 1;
    if (child instanceof Container) {
      total += countDescendants(child);
    }
  }
  return total;
}
