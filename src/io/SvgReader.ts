import { CliError } from "../errors/CliError";
import type { AttributeLookup } from "../model/AttributeLookup";
import { Container } from "../model/Container";
import { parseNumber } from "../model/NumberCodec";
import type { Shape } from "../model/Shape";
import { SvgDocument } from "../model/SvgDocument";
import { SvgElementFactory } from "./SvgElementFactory";
import type { TextFileSystem } from "./TextFileSystem";
import { XmlElement } from "./XmlElement";
import { XmlParser } from "./XmlParser";

/** Result of reading one SVG file. */
export interface ReadResult {
  readonly document: SvgDocument;
  readonly warnings: readonly string[];
  readonly elementCount: number;
}

interface ReadContext {
  readonly warnings: string[];
  readonly usedIds: Set<string>;
  readonly counters: Map<string, number>;
}

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

/**
 * Reads an SVG file into the domain model.
 *
 * Rules from the assignment:
 * - missing ids are auto assigned as `<tag><sequence>` (e.g. `rect1`) and a
 *   warning is reported for each of them;
 * - unsupported elements (title, defs, path, ...) are skipped silently so that
 *   ordinary SVG files can still be opened;
 * - attributes outside the supported whitelist are ignored on import.
 */
export class SvgReader {
  private readonly parser = new XmlParser();
  private readonly factory = new SvgElementFactory();

  public constructor(private readonly fileSystem: TextFileSystem) {}

  /** @throws CliError `cannot read file: <path>` / `invalid SVG: <path>` */
  public read(path: string): ReadResult {
    let source: string;
    try {
      source = this.fileSystem.readTextFile(path);
    } catch {
      throw new CliError(`cannot read file: ${path}`);
    }

    let root: XmlElement;
    try {
      root = this.parser.parse(source);
    } catch {
      throw new CliError(`invalid SVG: ${path}`);
    }
    if (SvgReader.localName(root.name) !== "svg") {
      throw new CliError(`invalid SVG: ${path}`);
    }

    const viewBox = SvgReader.parseViewBox(root.getAttribute("viewBox"));
    const width =
      SvgReader.parseLength(root.getAttribute("width")) ??
      viewBox?.width ??
      DEFAULT_WIDTH;
    const height =
      SvgReader.parseLength(root.getAttribute("height")) ??
      viewBox?.height ??
      DEFAULT_HEIGHT;
    if (!(width > 0) || !(height > 0)) {
      throw new CliError(`invalid SVG: ${path}`);
    }

    const context: ReadContext = {
      warnings: [],
      usedIds: new Set<string>(),
      counters: new Map<string, number>(),
    };
    const document = new SvgDocument(width, height);
    try {
      for (const child of root.children) {
        this.importElement(child, document, null, context);
      }
    } catch {
      throw new CliError(`invalid SVG: ${path}`);
    }

    return {
      document,
      warnings: context.warnings,
      elementCount: document.elementCount(),
    };
  }

  private importElement(
    element: XmlElement,
    document: SvgDocument,
    parent: Container | null,
    context: ReadContext,
  ): void {
    const local = SvgReader.localName(element.name);
    if (!this.factory.supports(local)) {
      return;
    }
    const id = this.assignId(element, local, context);
    const attributes: AttributeLookup = (name) => element.getAttribute(name);
    const shape = this.factory.create(local, id, attributes, element.text);
    this.applyPresentation(shape, attributes);
    document.attachShape(shape, parent);

    if (shape instanceof Container) {
      for (const child of element.children) {
        this.importElement(child, document, shape, context);
      }
    }
  }

  private applyPresentation(shape: Shape, attributes: AttributeLookup): void {
    const fill = attributes("fill");
    if (fill !== undefined) {
      shape.setAttribute("fill", fill);
    }
    const stroke = attributes("stroke");
    if (stroke !== undefined) {
      shape.setAttribute("stroke", stroke);
    }
    const strokeWidth = attributes("stroke-width");
    if (strokeWidth !== undefined) {
      shape.setAttribute("stroke-width", strokeWidth);
    }
  }

  private assignId(
    element: XmlElement,
    local: string,
    context: ReadContext,
  ): string {
    const rawId = element.getAttribute("id")?.trim() ?? "";
    if (rawId.length > 0) {
      if (!context.usedIds.has(rawId)) {
        context.usedIds.add(rawId);
        return rawId;
      }
      const generated = this.nextAutoId(local, context);
      context.warnings.push(
        `duplicate id ${rawId} on <${local}>, assigned id ${generated}`,
      );
      return generated;
    }
    const generated = this.nextAutoId(local, context);
    context.warnings.push(`assigned id ${generated} to unnamed <${local}>`);
    return generated;
  }

  private nextAutoId(local: string, context: ReadContext): string {
    let counter = context.counters.get(local) ?? 0;
    let candidate = `${local}${counter + 1}`;
    while (context.usedIds.has(candidate)) {
      counter += 1;
      candidate = `${local}${counter + 1}`;
    }
    context.counters.set(local, counter + 1);
    context.usedIds.add(candidate);
    return candidate;
  }

  private static localName(name: string): string {
    const colon = name.indexOf(":");
    return colon < 0 ? name : name.slice(colon + 1);
  }

  private static parseLength(raw: string | undefined): number | null {
    if (raw === undefined) {
      return null;
    }
    const match = /^\s*(-?\d+(?:\.\d+)?)/.exec(raw);
    if (match === null) {
      return null;
    }
    const value = parseNumber(match[1], "length");
    return value > 0 ? value : null;
  }

  private static parseViewBox(
    raw: string | undefined,
  ): { width: number; height: number } | null {
    if (raw === undefined) {
      return null;
    }
    const parts = raw.trim().split(/[\s,]+/);
    if (parts.length !== 4) {
      return null;
    }
    const width = Number(parts[2]);
    const height = Number(parts[3]);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return null;
    }
    return { width, height };
  }
}
