import { formatNumber, parseNumber } from "./NumberCodec";
import { LeafShape } from "./LeafShape";
import type { AttributeEntry } from "./Shape";
import type { Point } from "./Point";
import type { ShapeType } from "./ShapeType";

/** SVG `<line>`: two end points. */
export class Line extends LeafShape {
  private x1Value: number;
  private y1Value: number;
  private x2Value: number;
  private y2Value: number;

  public constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id);
    this.x1Value = x1;
    this.y1Value = y1;
    this.x2Value = x2;
    this.y2Value = y2;
    this.bindAttribute(
      "x1",
      (raw) => {
        this.x1Value = parseNumber(raw, "x1");
      },
      () => formatNumber(this.x1Value),
    );
    this.bindAttribute(
      "y1",
      (raw) => {
        this.y1Value = parseNumber(raw, "y1");
      },
      () => formatNumber(this.y1Value),
    );
    this.bindAttribute(
      "x2",
      (raw) => {
        this.x2Value = parseNumber(raw, "x2");
      },
      () => formatNumber(this.x2Value),
    );
    this.bindAttribute(
      "y2",
      (raw) => {
        this.y2Value = parseNumber(raw, "y2");
      },
      () => formatNumber(this.y2Value),
    );
  }

  public override get type(): ShapeType {
    return "line";
  }

  public override get tagName(): string {
    return "line";
  }

  public override get anchor(): Point {
    return { x: this.x1Value, y: this.y1Value };
  }

  public get x1(): number {
    return this.x1Value;
  }

  public get y1(): number {
    return this.y1Value;
  }

  public get x2(): number {
    return this.x2Value;
  }

  public get y2(): number {
    return this.y2Value;
  }

  protected override describeGeometry(): string {
    return `(${formatNumber(this.x1Value)},${formatNumber(this.y1Value)}) -> (${formatNumber(this.x2Value)},${formatNumber(this.y2Value)})`;
  }

  protected override geometryEntries(): AttributeEntry[] {
    return [
      ["x1", formatNumber(this.x1Value)],
      ["y1", formatNumber(this.y1Value)],
      ["x2", formatNumber(this.x2Value)],
      ["y2", formatNumber(this.y2Value)],
    ];
  }

  protected override translate(dx: number, dy: number): void {
    this.x1Value += dx;
    this.y1Value += dy;
    this.x2Value += dx;
    this.y2Value += dy;
  }

  protected override scaleGeometry(factor: number): void {
    this.x1Value *= factor;
    this.y1Value *= factor;
    this.x2Value *= factor;
    this.y2Value *= factor;
  }

  protected override cloneShape(): Line {
    return new Line(this.id, this.x1Value, this.y1Value, this.x2Value, this.y2Value);
  }
}
