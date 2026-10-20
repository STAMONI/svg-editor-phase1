import { CliError } from "../errors/CliError";
import type { AttributeLookup } from "./AttributeLookup";
import { Circle } from "./Circle";
import { Ellipse } from "./Ellipse";
import { Group } from "./Group";
import { Line } from "./Line";
import { parseNumber, parsePositiveNumber } from "./NumberCodec";
import { Rect } from "./Rect";
import type { Shape } from "./Shape";
import { TextShape } from "./TextShape";

type SvgShapeBuilder = (
  id: string,
  attributes: AttributeLookup,
  content: string,
) => Shape;

/**
 * The single shape factory of the system (one of the two allowed "dispatch by
 * name" points, next to CommandRegistry).
 *
 * It has two creation entry points for the same set of built-in types:
 * - `createFromTokens`: CLI tokens (`create <type> <id> [params…]`), validating
 *   the positional parameter schema before a shape object exists;
 * - `createFromSvgElement`: attributes of an imported SVG element, delegating
 *   to the polymorphic `createFromSvg` factory of each model class.
 *
 * Both directions live in one class on purpose: the assignment allows exactly
 * two name based dispatch points, and import/export must not introduce a third
 * one. It is deliberately flagged as a future refactoring point: the plugin
 * phase will replace the switch with a ShapeProvider registry so new shape
 * types can be added without touching the kernel.
 */
export class ShapeFactory {
  /** SVG element name -> polymorphic model constructor (import side). */
  private readonly svgBuilders = new Map<string, SvgShapeBuilder>([
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

  /** Creates a shape from CLI parameter tokens (`create` command). */
  public createFromTokens(
    typeName: string,
    id: string,
    params: readonly string[],
  ): Shape {
    switch (typeName) {
      case "rect":
        return this.createRect(id, params);
      case "circle":
        return this.createCircle(id, params);
      case "ellipse":
        return this.createEllipse(id, params);
      case "line":
        return this.createLine(id, params);
      case "text":
        return this.createText(id, params);
      case "g":
        return this.createGroup(id, params);
      default:
        throw new CliError(
          `unknown shape type: ${typeName} (is the plugin loaded?)`,
        );
    }
  }

  /** True when an imported SVG element of this name is supported. */
  public supportsSvgElement(localName: string): boolean {
    return this.svgBuilders.has(localName);
  }

  /** Creates a shape from the attributes of one imported SVG element. */
  public createFromSvgElement(
    localName: string,
    id: string,
    attributes: AttributeLookup,
    content: string,
  ): Shape {
    const builder = this.svgBuilders.get(localName);
    if (builder === undefined) {
      throw new Error(`unsupported SVG element: ${localName}`);
    }
    return builder(id, attributes, content);
  }

  private createRect(id: string, params: readonly string[]): Rect {
    this.assertParamCount("rect", params, 4, 5);
    const shape = new Rect(
      id,
      parseNumber(params[0], "x"),
      parseNumber(params[1], "y"),
      parsePositiveNumber(params[2], "width"),
      parsePositiveNumber(params[3], "height"),
    );
    this.applyOptionalFill(shape, params[4]);
    return shape;
  }

  private createCircle(id: string, params: readonly string[]): Circle {
    this.assertParamCount("circle", params, 3, 4);
    const shape = new Circle(
      id,
      parseNumber(params[0], "cx"),
      parseNumber(params[1], "cy"),
      parsePositiveNumber(params[2], "r"),
    );
    this.applyOptionalFill(shape, params[3]);
    return shape;
  }

  private createEllipse(id: string, params: readonly string[]): Ellipse {
    this.assertParamCount("ellipse", params, 4, 5);
    const shape = new Ellipse(
      id,
      parseNumber(params[0], "cx"),
      parseNumber(params[1], "cy"),
      parsePositiveNumber(params[2], "rx"),
      parsePositiveNumber(params[3], "ry"),
    );
    this.applyOptionalFill(shape, params[4]);
    return shape;
  }

  private createLine(id: string, params: readonly string[]): Line {
    this.assertParamCount("line", params, 4, 5);
    const shape = new Line(
      id,
      parseNumber(params[0], "x1"),
      parseNumber(params[1], "y1"),
      parseNumber(params[2], "x2"),
      parseNumber(params[3], "y2"),
    );
    const stroke = params[4];
    if (stroke !== undefined) {
      shape.setAttribute("stroke", stroke);
    }
    return shape;
  }

  private createText(id: string, params: readonly string[]): TextShape {
    this.assertParamCount("text", params, 3, 3);
    return new TextShape(
      id,
      parseNumber(params[0], "x"),
      parseNumber(params[1], "y"),
      params[2],
    );
  }

  private createGroup(id: string, params: readonly string[]): Group {
    this.assertParamCount("g", params, 0, 0);
    return new Group(id);
  }

  private applyOptionalFill(shape: Shape, fill: string | undefined): void {
    if (fill !== undefined) {
      shape.setAttribute("fill", fill);
    }
  }

  private assertParamCount(
    typeName: string,
    params: readonly string[],
    min: number,
    max: number,
  ): void {
    if (params.length < min || params.length > max) {
      throw new CliError(
        `invalid parameters for create ${typeName} (expected ${min === max ? min : `${min} or ${max}`} parameters, got ${params.length})`,
      );
    }
  }
}
