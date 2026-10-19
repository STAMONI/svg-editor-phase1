import { parseNumber, parsePositiveNumber } from "./NumberCodec";

/** Read-only lookup of SVG attributes, decoupled from the XML implementation. */
export type AttributeLookup = (name: string) => string | undefined;

/** Reads an optional numeric attribute, falling back to `fallback`. */
export function attributeNumber(
  attributes: AttributeLookup,
  name: string,
  fallback: number,
): number {
  const raw = attributes(name);
  if (raw === undefined) {
    return fallback;
  }
  return parseNumber(raw, name);
}

/** Reads a required positive numeric attribute. */
export function attributePositiveNumber(
  attributes: AttributeLookup,
  name: string,
): number {
  const raw = attributes(name);
  if (raw === undefined) {
    throw new Error(`missing attribute: ${name}`);
  }
  return parsePositiveNumber(raw, name);
}
