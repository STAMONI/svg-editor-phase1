/**
 * Minimal XML element used by the SVG reader.
 *
 * The parser is intentionally small (no external dependency): it keeps the
 * element name, its attributes, child elements and the character data of the
 * element itself (needed for `<text>` content).
 */
export class XmlElement {
  private readonly nameValue: string;
  private readonly attributeMap = new Map<string, string>();
  private readonly childElements: XmlElement[] = [];
  private readonly textChunks: string[] = [];

  public constructor(name: string) {
    this.nameValue = name;
  }

  public get name(): string {
    return this.nameValue;
  }

  public getAttribute(attributeName: string): string | undefined {
    return this.attributeMap.get(attributeName);
  }

  public setAttribute(attributeName: string, value: string): void {
    this.attributeMap.set(attributeName, value);
  }

  public appendChild(child: XmlElement): void {
    this.childElements.push(child);
  }

  public appendText(text: string): void {
    this.textChunks.push(text);
  }

  public get children(): readonly XmlElement[] {
    return this.childElements;
  }

  /** Character data of this element (trimmed), ignoring nested elements. */
  public get text(): string {
    return this.textChunks.join("").trim();
  }
}
