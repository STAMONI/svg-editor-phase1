import { CliError } from "../../errors/CliError";
import { Circle } from "../../model/Circle";
import { Ellipse } from "../../model/Ellipse";
import { Group } from "../../model/Group";
import { Line } from "../../model/Line";
import {
  parseNumber,
  parsePositiveNumber,
} from "../../model/NumberCodec";
import { Rect } from "../../model/Rect";
import type { Shape } from "../../model/Shape";
import { TextShape } from "../../model/TextShape";

/**
 * Factory for the six built-in shape types.
 *
 * This is the second allowed "dispatch by name" point of the architecture
 * (the first one is CommandRegistry): it converts a type name plus raw
 * argument tokens into a fully validated domain object. Parameter validation
 * happens here, before the shape exists, so a failed `create` cannot leave a
 * half-built object behind.
 *
 * Deliberately marked as a future refactoring point: the pluginization phase
 * will replace this switch with a ShapeProvider registry so new shape types can
 * be added without touching the kernel.
 */
export class ShapeFactory {
  public create(typeName: string, id: string, params: readonly string[]): Shape {
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
