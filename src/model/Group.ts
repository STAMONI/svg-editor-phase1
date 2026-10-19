import { Container } from "./Container";
import type { ShapeType } from "./ShapeType";

/** SVG `<g>`: the built-in group container. */
export class Group extends Container {
  public constructor(id: string) {
    super(id);
  }

  public override get type(): ShapeType {
    return "g";
  }

  public override get tagName(): string {
    return "g";
  }

  protected override createEmptyContainer(): Container {
    return new Group(this.id);
  }
}
