import { formatNumber, parseNumber, parsePositiveNumber } from "./NumberCodec";
import { LeafShape } from "./LeafShape";
import type { AttributeEntry } from "./Shape";
import type { Point } from "./Point";
import type { ShapeType } from "./ShapeType";

/** SVG `<circle>`: center plus radius. */
export class Circle extends LeafShape {
  private cxValue: number;
  private cyValue: number;
  private radiusValue: number;

  public constructor(id: string, cx: number, cy: number, radius: number) {
    super(id);
    this.cxValue = cx;
    this.cyValue = cy;
    this.radiusValue = radius;
    this.bindAttribute(
      "cx",
      (raw) => {
        this.cxValue = parseNumber(raw, "cx");
      },
      () => formatNumber(this.cxValue),
    );
    this.bindAttribute(
      "cy",
      (raw) => {
        this.cyValue = parseNumber(raw, "cy");
      },
      () => formatNumber(this.cyValue),
    );
    this.bindAttribute(
      "r",
      (raw) => {
        this.radiusValue = parsePositiveNumber(raw, "r");
      },
      () => formatNumber(this.radiusValue),
    );
  }

  public override get type(): ShapeType {
    return "circle";
  }

  public override get tagName(): string {
    return "circle";
  }

  public override get anchor(): Point {
    return { x: this.cxValue, y: this.cyValue };
  }

  public get cx(): number {
    return this.cxValue;
  }

  public get cy(): number {
    return this.cyValue;
  }

  public get r(): number {
    return this.radiusValue;
  }

  protected override describeGeometry(): string {
    return `cx=${formatNumber(this.cxValue)} cy=${formatNumber(this.cyValue)} r=${formatNumber(this.radiusValue)}`;
  }

  protected override geometryEntries(): AttributeEntry[] {
    return [
      ["cx", formatNumber(this.cxValue)],
      ["cy", formatNumber(this.cyValue)],
      ["r", formatNumber(this.radiusValue)],
    ];
  }

  protected override translate(dx: number, dy: number): void {
    this.cxValue += dx;
    this.cyValue += dy;
  }

  protected override scaleGeometry(factor: number): void {
    this.cxValue *= factor;
    this.cyValue *= factor;
    this.radiusValue *= factor;
  }

  protected override cloneShape(): Circle {
    return new Circle(this.id, this.cxValue, this.cyValue, this.radiusValue);
  }
}
