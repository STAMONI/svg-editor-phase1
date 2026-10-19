import { CliError } from "../errors/CliError";
import { XmlElement } from "./XmlElement";

interface StartTag {
  readonly element: XmlElement;
  readonly selfClosing: boolean;
  readonly nextIndex: number;
}

/**
 * Small, dependency free XML parser sufficient for SVG documents.
 *
 * Supported: XML declaration, comments, DOCTYPE (including internal subsets),
 * CDATA, quoted and unquoted attribute values, predefined and numeric entities.
 * Namespace prefixes are kept verbatim; the SVG reader compares local names.
 */
export class XmlParser {
  /** @throws CliError when the document is not well formed */
  public parse(source: string): XmlElement {
    const roots: XmlElement[] = [];
    const stack: XmlElement[] = [];
    let index = 0;

    while (index < source.length) {
      if (source[index] !== "<") {
        const nextTag = source.indexOf("<", index);
        const end = nextTag < 0 ? source.length : nextTag;
        const rawText = source.slice(index, end);
        const parent = stack[stack.length - 1];
        if (parent !== undefined) {
          parent.appendText(XmlParser.decodeEntities(rawText));
        }
        index = end;
        continue;
      }
      if (source.startsWith("<!--", index)) {
        index = this.skipAfter(source, index + 4, "-->");
        continue;
      }
      if (source.startsWith("<?", index)) {
        index = this.skipAfter(source, index + 2, "?>");
        continue;
      }
      if (source.startsWith("<![CDATA[", index)) {
        const end = source.indexOf("]]>", index + 9);
        if (end < 0) {
          throw new CliError("invalid SVG: unterminated CDATA");
        }
        const parent = stack[stack.length - 1];
        if (parent !== undefined) {
          parent.appendText(source.slice(index + 9, end));
        }
        index = end + 3;
        continue;
      }
      if (source.startsWith("<!", index)) {
        index = this.skipDeclaration(source, index + 2);
        continue;
      }
      if (source.startsWith("</", index)) {
        const end = source.indexOf(">", index);
        if (end < 0) {
          throw new CliError("invalid SVG: unterminated closing tag");
        }
        const name = source.slice(index + 2, end).trim();
        const open = stack.pop();
        if (open === undefined || open.name !== name) {
          throw new CliError(`invalid SVG: mismatched closing tag </${name}>`);
        }
        index = end + 1;
        continue;
      }
      const startTag = this.readStartTag(source, index);
      const parent = stack[stack.length - 1];
      if (parent === undefined) {
        roots.push(startTag.element);
      } else {
        parent.appendChild(startTag.element);
      }
      if (!startTag.selfClosing) {
        stack.push(startTag.element);
      }
      index = startTag.nextIndex;
    }

    if (stack.length > 0) {
      throw new CliError("invalid SVG: unclosed element");
    }
    const root = roots[0];
    if (root === undefined) {
      throw new CliError("invalid SVG: no root element");
    }
    return root;
  }

  private readStartTag(source: string, start: number): StartTag {
    let index = start + 1;
    const nameStart = index;
    while (index < source.length && !/[\s/>]/.test(source[index])) {
      index += 1;
    }
    const name = source.slice(nameStart, index);
    if (name.length === 0) {
      throw new CliError("invalid SVG: empty tag name");
    }
    const element = new XmlElement(name);
    let selfClosing = false;

    while (index < source.length) {
      while (index < source.length && /\s/.test(source[index])) {
        index += 1;
      }
      if (source.startsWith("/>", index)) {
        selfClosing = true;
        index += 2;
        break;
      }
      if (source[index] === ">") {
        index += 1;
        break;
      }
      const attributeStart = index;
      while (index < source.length && !/[\s=/>]/.test(source[index])) {
        index += 1;
      }
      const attributeName = source.slice(attributeStart, index);
      if (attributeName.length === 0) {
        throw new CliError("invalid SVG: malformed attribute");
      }
      while (index < source.length && /\s/.test(source[index])) {
        index += 1;
      }
      if (source[index] !== "=") {
        throw new CliError(`invalid SVG: missing value for attribute ${attributeName}`);
      }
      index += 1;
      while (index < source.length && /\s/.test(source[index])) {
        index += 1;
      }
      const quote = source[index];
      let rawValue: string;
      if (quote === '"' || quote === "'") {
        const end = source.indexOf(quote, index + 1);
        if (end < 0) {
          throw new CliError("invalid SVG: unterminated attribute value");
        }
        rawValue = source.slice(index + 1, end);
        index = end + 1;
      } else {
        const valueStart = index;
        while (index < source.length && !/[\s/>]/.test(source[index])) {
          index += 1;
        }
        rawValue = source.slice(valueStart, index);
      }
      element.setAttribute(attributeName, XmlParser.decodeEntities(rawValue));
    }

    return { element, selfClosing, nextIndex: index };
  }

  /** Skips a construct up to and including `terminator`. */
  private skipAfter(source: string, from: number, terminator: string): number {
    const end = source.indexOf(terminator, from);
    if (end < 0) {
      throw new CliError("invalid SVG: unterminated construct");
    }
    return end + terminator.length;
  }

  /** Skips a `<!DOCTYPE …>` declaration including an optional internal subset. */
  private skipDeclaration(source: string, from: number): number {
    let index = from;
    let depth = 0;
    let quote: string | null = null;
    while (index < source.length) {
      const char = source[index];
      if (quote !== null) {
        if (char === quote) {
          quote = null;
        }
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === "[") {
        depth += 1;
      } else if (char === "]") {
        depth -= 1;
      } else if (char === ">" && depth === 0) {
        return index + 1;
      }
      index += 1;
    }
    throw new CliError("invalid SVG: unterminated declaration");
  }

  private static decodeEntities(text: string): string {
    return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
      switch (entity) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
          return "'";
        default: {
          if (entity.startsWith("#x") || entity.startsWith("#X")) {
            const code = Number.parseInt(entity.slice(2), 16);
            return Number.isFinite(code) ? String.fromCodePoint(code) : match;
          }
          if (entity.startsWith("#")) {
            const code = Number.parseInt(entity.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : match;
          }
          return match;
        }
      }
    });
  }
}
