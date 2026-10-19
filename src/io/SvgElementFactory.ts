import type { AttributeLookup } from "../model/AttributeLookup";
import { Circle } from "../model/Circle";
import { Ellipse } from "../model/Ellipse";
import { Group } from "../model/Group";
import { Line } from "../model/Line";
import { Rect } from "../model/Rect";
import type { Shape } from "../model/Shape";
import { TextShape } from "../model/TextShape";

type SvgShapeBuilder = (
  id: string,
  attributes: AttributeLookup,
  content: string,
) => Shape;

/**
 * Import side factory: maps an SVG element name to the polymorphic
 * `createFromSvg` factory of the corresponding model class.
 *
 * Same category as ShapeFactory (one of the two allowed "dispatch by name"
 * points): a lookup table, not a behaviour switch. Adding a shape type means
 * registering one builder here — the reader does not change.
 */
export class SvgElementFactory {
  private readonly buildersByName = new Map<string, SvgShapeBuilder>([
    ["rect", (id, attributes) => Rect.createFromSvg(id, attributes)],
    ["circle", (id, attributes) => Circle.createFromSvg(id, attributes)],
    ["ellipse", (id, attributes) => Ellipse.createFromSvg(id, attributes)],
    ["line", (id, attributes) => Line.createFromSvg(id, attributes)],
    [
      "text",
      (id, attributes, content) =>
        TextShape.createFromSvg(id, attributes, content),
    ],
    ["g", (id, attributes) => Group.createFromSvg(id, attributes)],
  ]);

  public supports(localName: string): boolean {
    return this.buildersByName.has(localName);
  }

  /** @throws Error when the element is not supported or malformed */
  public create(
    localName: string,
    id: string,
    attributes: AttributeLookup,
    content: string,
  ): Shape {
    const builder = this.buildersByName.get(localName);
    if (builder === undefined) {
      throw new Error(`unsupported SVG element: ${localName}`);
    }
    return builder(id, attributes, content);
  }
}
