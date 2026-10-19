import { formatNumber, parseNumber, parsePositiveNumber } from "./NumberCodec";
import {
  attributeNumber,
  attributePositiveNumber,
} from "./AttributeLookup";
import type { AttributeLookup } from "./AttributeLookup";
import { LeafShape } from "./LeafShape";
import type { AttributeEntry } from "./Shape";
import type { Point } from "./Point";
import type { ShapeType } from "./ShapeType";

/** SVG `<rect>`: top-left corner plus size. */
export class Rect extends LeafShape {
  private xValue: number;
  private yValue: number;
  private widthValue: number;
  private heightValue: number;

  public constructor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    super(id);
    this.xValue = x;
    this.yValue = y;
    this.widthValue = width;
    this.heightValue = height;
    this.bindAttribute(
      "x",
      (raw) => {
        this.xValue = parseNumber(raw, "x");
      },
      () => formatNumber(this.xValue),
    );
    this.bindAttribute(
      "y",
      (raw) => {
        this.yValue = parseNumber(raw, "y");
      },
      () => formatNumber(this.yValue),
    );
    this.bindAttribute(
      "width",
      (raw) => {
        this.widthValue = parsePositiveNumber(raw, "width");
      },
      () => formatNumber(this.widthValue),
    );
    this.bindAttribute(
      "height",
      (raw) => {
        this.heightValue = parsePositiveNumber(raw, "height");
      },
      () => formatNumber(this.heightValue),
    );
  }

  public override get type(): ShapeType {
    return "rect";
  }

  /** Builds a rect from SVG attributes (missing x/y default to 0). */
  public static createFromSvg(id: string, attributes: AttributeLookup): Rect {
    return new Rect(
      id,
      attributeNumber(attributes, "x", 0),
      attributeNumber(attributes, "y", 0),
      attributePositiveNumber(attributes, "width"),
      attributePositiveNumber(attributes, "height"),
    );
  }

  public override get tagName(): string {
    return "rect";
  }

  public override get anchor(): Point {
    return { x: this.xValue, y: this.yValue };
  }

  public get x(): number {
    return this.xValue;
  }

  public get y(): number {
    return this.yValue;
  }

  public get width(): number {
    return this.widthValue;
  }

  public get height(): number {
    return this.heightValue;
  }

  protected override describeGeometry(): string {
    return `x=${formatNumber(this.xValue)} y=${formatNumber(this.yValue)} w=${formatNumber(this.widthValue)} h=${formatNumber(this.heightValue)}`;
  }

  protected override geometryEntries(): AttributeEntry[] {
    return [
      ["x", formatNumber(this.xValue)],
      ["y", formatNumber(this.yValue)],
      ["width", formatNumber(this.widthValue)],
      ["height", formatNumber(this.heightValue)],
    ];
  }

  protected override translate(dx: number, dy: number): void {
    this.xValue += dx;
    this.yValue += dy;
  }

  protected override scaleGeometry(factor: number): void {
    this.xValue *= factor;
    this.yValue *= factor;
    this.widthValue *= factor;
    this.heightValue *= factor;
  }

  protected override cloneShape(): Rect {
    return new Rect(this.id, this.xValue, this.yValue, this.widthValue, this.heightValue);
  }
}
