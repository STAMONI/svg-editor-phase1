import { CliError } from "../errors/CliError";
import { formatNumber, parseNumber } from "./NumberCodec";
import type { Container } from "./Container";
import type { Point } from "./Point";
import type { ShapeType } from "./ShapeType";

/** One serialized SVG attribute as a raw (unescaped) name/value pair. */
export type AttributeEntry = readonly [name: string, value: string];

/** Setter plus getter for one whitelisted geometry attribute. */
interface AttributeBinding {
  readonly set: (raw: string) => void;
  readonly get: () => string;
}

/**
 * Abstract component of the Composite pattern.
 *
 * A shape owns its identity (`id`, unique and case sensitive), its parent link
 * and its presentation attributes (`fill`, `stroke`, `stroke-width`). Geometry
 * and the behaviour that depends on it (`move`, `scale`, rendering) are
 * delegated to subclasses, so commands can talk to `Shape` without knowing the
 * concrete type — there is no `switch (tag)` dispatch anywhere in the system.
 *
 * Most setters are exposed through `setAttribute`, which enforces the
 * attribute whitelist of the assignment and keeps every geometry field private.
 */
export abstract class Shape {
  private readonly shapeId: string;
  private parentContainer: Container | null = null;
  private fillValue: string | null = null;
  private strokeValue: string | null = null;
  private strokeWidthValue: number | null = null;
  private readonly attributeBindings = new Map<string, AttributeBinding>();

  protected constructor(id: string) {
    if (id.length === 0) {
      throw new CliError("shape id must not be empty");
    }
    // SVG ids are XML names: whitespace inside an id would produce a file that
    // CSS / URL fragments cannot address, so it is rejected early.
    if (/\s/.test(id)) {
      throw new CliError(`invalid id: ${id}`);
    }
    this.shapeId = id;
  }

  /** Unique, case sensitive identifier. */
  public get id(): string {
    return this.shapeId;
  }

  /** Owning container, or `null` for the document root and detached nodes. */
  public get parent(): Container | null {
    return this.parentContainer;
  }

  /** Type name used by the factory / registry (see ShapeType). */
  public abstract get type(): ShapeType;

  /** SVG element name (`rect`, `circle`, `g`, ...). */
  public abstract get tagName(): string;

  /** Presentation attributes, empty string when unset. */
  public get fill(): string | null {
    return this.fillValue;
  }

  public get stroke(): string | null {
    return this.strokeValue;
  }

  public get strokeWidth(): number | null {
    return this.strokeWidthValue;
  }

  /**
   * Internal tree hook: only containers and the document call this.
   */
  public attachToParent(parent: Container | null): void {
    this.parentContainer = parent;
  }

  /**
   * Translates the shape. Containers override this to recurse into children.
   */
  public abstract move(dx: number, dy: number): void;

  /**
   * Scales all geometry attributes by `factor`. Containers recurse into their
   * children; leaves multiply positions and sizes.
   */
  public abstract scale(factor: number): void;

  /**
   * Representative point used by `move` feedback, or `null` when the shape has
   * no single anchor (containers).
   */
  public abstract get anchor(): Point | null;

  /** Returns `this` when the id matches, otherwise searches the subtree. */
  public abstract findInSubtree(id: string): Shape | null;

  /**
   * Sets one attribute, enforcing the whitelist of the concrete class.
   *
   * @throws CliError `unknown attribute: <name>` when the attribute is not
   *   part of the whitelist of this shape type.
   */
  public setAttribute(name: string, raw: string): void {
    switch (name) {
      case "fill":
        this.fillValue = raw;
        return;
      case "stroke":
        this.strokeValue = raw;
        return;
      case "stroke-width": {
        const width = parseNumber(raw, "stroke-width");
        if (width < 0) {
          throw new CliError("stroke-width must be non-negative");
        }
        this.strokeWidthValue = width;
        return;
      }
      default: {
        const binding = this.attributeBindings.get(name);
        if (binding === undefined) {
          throw new CliError(`unknown attribute: ${name}`);
        }
        binding.set(raw);
      }
    }
  }

  /**
   * Reads one whitelisted attribute as the CLI would print it, or `null` when
   * the attribute is not set. Used for `set` feedback and undo summaries.
   */
  public attributeValue(name: string): string | null {
    switch (name) {
      case "fill":
        return this.fillValue;
      case "stroke":
        return this.strokeValue;
      case "stroke-width":
        return this.strokeWidthValue === null
          ? null
          : formatNumber(this.strokeWidthValue);
      default: {
        const binding = this.attributeBindings.get(name);
        if (binding === undefined) {
          throw new CliError(`unknown attribute: ${name}`);
        }
        return binding.get();
      }
    }
  }

  /** Deep copy including children for containers; new parent links are reset. */
  public clone(): Shape {
    const copy = this.cloneShape();
    copy.fillValue = this.fillValue;
    copy.strokeValue = this.strokeValue;
    copy.strokeWidthValue = this.strokeWidthValue;
    return copy;
  }

  /** Serialized attributes: `id`, then geometry, then presentation. */
  public attributeEntries(): AttributeEntry[] {
    const entries: AttributeEntry[] = [["id", this.shapeId]];
    for (const entry of this.geometryEntries()) {
      entries.push(entry);
    }
    for (const entry of this.styleEntries()) {
      entries.push(entry);
    }
    return entries;
  }

  /**
   * Inline description used by `tree`: geometry plus fill.
   *
   * The assignment's tree examples inline the key geometry and (when set) the
   * fill colour; stroke / stroke-width stay out of the tree and are shown in
   * full by `show`, so the tree matches the documented format exactly.
   */
  public describeInline(): string {
    const parts: string[] = [];
    const geometry = this.describeGeometry();
    if (geometry.length > 0) {
      parts.push(geometry);
    }
    if (this.fillValue !== null) {
      parts.push(`fill=${this.fillValue}`);
    }
    return parts.join(" ");
  }

  /** Multi line description used by `show` (one line per attribute group). */
  public describeDetails(): string[] {
    const lines: string[] = [];
    const geometry = this.describeGeometry();
    if (geometry.length > 0) {
      lines.push(geometry);
    }
    const style = this.describeStyle();
    if (style.length > 0) {
      lines.push(style);
    }
    return lines;
  }

  /** Text content for elements whose content is character data (`text`). */
  public contentText(): string | null {
    return null;
  }

  /** Creates a detached deep copy; style is copied by `clone`. */
  protected abstract cloneShape(): Shape;

  protected abstract describeGeometry(): string;

  protected abstract geometryEntries(): AttributeEntry[];

  /** Registers the setter and getter of a geometry attribute. */
  protected bindAttribute(
    name: string,
    set: (raw: string) => void,
    get: () => string,
  ): void {
    this.attributeBindings.set(name, { set, get });
  }

  private describeStyle(): string {
    const parts: string[] = [];
    if (this.fillValue !== null) {
      parts.push(`fill=${this.fillValue}`);
    }
    if (this.strokeValue !== null) {
      parts.push(`stroke=${this.strokeValue}`);
    }
    if (this.strokeWidthValue !== null) {
      parts.push(`stroke-width=${formatNumber(this.strokeWidthValue)}`);
    }
    return parts.join(" ");
  }

  private styleEntries(): AttributeEntry[] {
    const entries: AttributeEntry[] = [];
    if (this.fillValue !== null) {
      entries.push(["fill", this.fillValue]);
    }
    if (this.strokeValue !== null) {
      entries.push(["stroke", this.strokeValue]);
    }
    if (this.strokeWidthValue !== null) {
      entries.push(["stroke-width", formatNumber(this.strokeWidthValue)]);
    }
    return entries;
  }
}
