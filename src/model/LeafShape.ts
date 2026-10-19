import { Shape } from "./Shape";

/**
 * Base class of shapes without children.
 *
 * `move` / `scale` are template methods: they delegate to the geometry
 * specific hooks so that every leaf only implements its own attribute math.
 */
export abstract class LeafShape extends Shape {
  public override move(dx: number, dy: number): void {
    this.translate(dx, dy);
  }

  public override scale(factor: number): void {
    this.scaleGeometry(factor);
  }

  public override findInSubtree(id: string): Shape | null {
    return this.id === id ? this : null;
  }

  protected abstract translate(dx: number, dy: number): void;

  protected abstract scaleGeometry(factor: number): void;
}
