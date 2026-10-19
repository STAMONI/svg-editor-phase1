import { formatNumber, parseNumber, parsePositiveNumber } from "./NumberCodec";
import { LeafShape } from "./LeafShape";
import type { AttributeEntry } from "./Shape";
import type { Point } from "./Point";
import type { ShapeType } from "./ShapeType";

/** SVG `<ellipse>`: center plus two radii. */
export class Ellipse extends LeafShape {
  private cxValue: number;
  private cyValue: number;
  private rxValue: number;
  private ryValue: number;

  public constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id);
    this.cxValue = cx;
    this.cyValue = cy;
    this.rxValue = rx;
    this.ryValue = ry;
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
      "rx",
      (raw) => {
        this.rxValue = parsePositiveNumber(raw, "rx");
      },
      () => formatNumber(this.rxValue),
    );
    this.bindAttribute(
      "ry",
      (raw) => {
        this.ryValue = parsePositiveNumber(raw, "ry");
      },
      () => formatNumber(this.ryValue),
    );
  }

  public override get type(): ShapeType {
    return "ellipse";
  }

  public override get tagName(): string {
    return "ellipse";
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

  public get rx(): number {
    return this.rxValue;
  }

  public get ry(): number {
    return this.ryValue;
  }

  protected override describeGeometry(): string {
    return `cx=${formatNumber(this.cxValue)} cy=${formatNumber(this.cyValue)} rx=${formatNumber(this.rxValue)} ry=${formatNumber(this.ryValue)}`;
  }

  protected override geometryEntries(): AttributeEntry[] {
    return [
      ["cx", formatNumber(this.cxValue)],
      ["cy", formatNumber(this.cyValue)],
      ["rx", formatNumber(this.rxValue)],
      ["ry", formatNumber(this.ryValue)],
    ];
  }

  protected override translate(dx: number, dy: number): void {
    this.cxValue += dx;
    this.cyValue += dy;
  }

  protected override scaleGeometry(factor: number): void {
    this.cxValue *= factor;
    this.cyValue *= factor;
    this.rxValue *= factor;
    this.ryValue *= factor;
  }

  protected override cloneShape(): Ellipse {
    return new Ellipse(this.id, this.cxValue, this.cyValue, this.rxValue, this.ryValue);
  }
}
