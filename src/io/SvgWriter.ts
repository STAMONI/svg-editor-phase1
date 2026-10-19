import { CliError } from "../errors/CliError";
import { Container } from "../model/Container";
import { formatNumber } from "../model/NumberCodec";
import type { Shape } from "../model/Shape";
import type { SvgDocument } from "../model/SvgDocument";
import type { TextFileSystem } from "./TextFileSystem";

const INDENT = "  ";

/**
 * Serializes the document to SVG and writes it through the file system
 * abstraction. Output is plain SVG that a browser renders directly.
 */
export class SvgWriter {
  public constructor(private readonly fileSystem: TextFileSystem) {}

  /** @throws CliError `cannot write file: <path>` */
  public write(path: string, document: SvgDocument): void {
    const content = this.serialize(document);
    try {
      this.fileSystem.writeTextFile(path, content);
    } catch {
      throw new CliError(`cannot write file: ${path}`);
    }
  }

  public serialize(document: SvgDocument): string {
    const width = formatNumber(document.width);
    const height = formatNumber(document.height);
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ];
    for (const child of document.canvas.children) {
      this.serializeShape(child, 1, lines);
    }
    lines.push("</svg>");
    return `${lines.join("\n")}\n`;
  }

  private serializeShape(shape: Shape, depth: number, lines: string[]): void {
    const indent = INDENT.repeat(depth);
    const attributes = shape
      .attributeEntries()
      .map(([name, value]) => `${name}="${SvgWriter.escapeAttribute(value)}"`)
      .join(" ");
    const content = shape.contentText();

    if (content !== null) {
      lines.push(
        `${indent}<${shape.tagName} ${attributes}>${SvgWriter.escapeText(content)}</${shape.tagName}>`,
      );
      return;
    }
    if (shape instanceof Container && shape.children.length > 0) {
      lines.push(`${indent}<${shape.tagName} ${attributes}>`);
      for (const child of shape.children) {
        this.serializeShape(child, depth + 1, lines);
      }
      lines.push(`${indent}</${shape.tagName}>`);
      return;
    }
    lines.push(`${indent}<${shape.tagName} ${attributes}/>`);
  }

  private static escapeAttribute(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  private static escapeText(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
