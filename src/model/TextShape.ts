import { formatNumber, parseNumber } from "./NumberCodec";
import { attributeNumber } from "./AttributeLookup";
import type { AttributeLookup } from "./AttributeLookup";
import { LeafShape } from "./LeafShape";
import type { AttributeEntry } from "./Shape";
import type { Point } from "./Point";
import type { ShapeType } from "./ShapeType";

/**
 * SVG `<text>`: anchor point plus character data.
 *
 * The content is child text, not an attribute, so it is serialized through
 * `contentText()` and edited through the `text` pseudo attribute, which is
 * part of the `set` whitelist of this type.
 */
export class TextShape extends LeafShape {
  private xValue: number;
  private yValue: number;
  private contentValue: string;

  public constructor(id: string, x: number, y: number, content: string) {
    super(id);
    this.xValue = x;
    this.yValue = y;
    this.contentValue = content;
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
      "text",
      (raw) => {
        this.contentValue = raw;
      },
      () => this.contentValue,
    );
  }

  public override get type(): ShapeType {
    return "text";
  }

  /** Builds a text node from SVG attributes plus its character data. */
  public static createFromSvg(
    id: string,
    attributes: AttributeLookup,
    content: string,
  ): TextShape {
    return new TextShape(
      id,
      attributeNumber(attributes, "x", 0),
      attributeNumber(attributes, "y", 0),
      content,
    );
  }

  public override get tagName(): string {
    return "text";
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

  public get content(): string {
    return this.contentValue;
  }

  public override contentText(): string {
    return this.contentValue;
  }

  public override describeDetails(): string[] {
    const lines: string[] = [
      `x=${formatNumber(this.xValue)} y=${formatNumber(this.yValue)}`,
      `text=${TextShape.quoteForDisplay(this.contentValue)}`,
    ];
    const style = super.describeDetails();
    // super returns the geometry line again; keep only the style part.
    lines.push(...style.slice(1));
    return lines;
  }

  protected override describeGeometry(): string {
    return `(${formatNumber(this.xValue)},${formatNumber(this.yValue)}) ${TextShape.quoteForDisplay(this.contentValue)}`;
  }

  /**
   * Quotes one text content for CLI output: quotes, backslashes and control
   * characters are escaped so `tree` / `show` stay on one readable line even
   * for text imported from foreign SVG files.
   */
  private static quoteForDisplay(value: string): string {
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t");
    return `"${escaped}"`;
  }

  protected override geometryEntries(): AttributeEntry[] {
    return [
      ["x", formatNumber(this.xValue)],
      ["y", formatNumber(this.yValue)],
    ];
  }

  protected override translate(dx: number, dy: number): void {
    this.xValue += dx;
    this.yValue += dy;
  }

  protected override scaleGeometry(factor: number): void {
    this.xValue *= factor;
    this.yValue *= factor;
  }

  protected override cloneShape(): TextShape {
    return new TextShape(this.id, this.xValue, this.yValue, this.contentValue);
  }
}
