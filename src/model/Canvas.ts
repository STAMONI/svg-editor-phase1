import { CliError } from "../errors/CliError";
import { formatNumber } from "./NumberCodec";
import { Container } from "./Container";
import type { ShapeType } from "./ShapeType";

/**
 * Document root: the `<svg>` element and its direct children.
 *
 * The canvas has an id (`svg`) but it is not addressable by commands; it is
 * never part of id lookups, so users cannot move or delete the root.
 */
export class Canvas extends Container {
  private widthValue: number;
  private heightValue: number;

  public constructor(width: number, height: number) {
    super("svg");
    this.assertPositive(width, height);
    this.widthValue = width;
    this.heightValue = height;
  }

  public override get type(): ShapeType {
    return "svg";
  }

  public override get tagName(): string {
    return "svg";
  }

  public get width(): number {
    return this.widthValue;
  }

  public get height(): number {
    return this.heightValue;
  }

  /** Changes the canvas size; both dimensions must be strictly positive. */
  public setSize(width: number, height: number): void {
    this.assertPositive(width, height);
    this.widthValue = width;
    this.heightValue = height;
  }

  public describeCanvasSize(): string {
    return `${formatNumber(this.widthValue)}x${formatNumber(this.heightValue)}`;
  }

  protected override describeGeometry(): string {
    return this.describeCanvasSize();
  }

  protected override createEmptyContainer(): Container {
    return new Canvas(this.widthValue, this.heightValue);
  }

  private assertPositive(width: number, height: number): void {
    if (!(width > 0) || !(height > 0)) {
      throw new CliError("canvas size must be positive");
    }
  }
}
