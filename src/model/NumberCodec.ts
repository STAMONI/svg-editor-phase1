import { CliError } from "../errors/CliError";

/** Maximum number of decimals kept when rendering numbers. */
const DECIMALS = 6;

/**
 * Parses a numeric token coming from the CLI or from an SVG attribute.
 *
 * @param raw token to parse
 * @param label human readable label used in the error message
 * @throws CliError when the token is not a finite number
 */
export function parseNumber(raw: string, label = "number"): number {
  const trimmed = raw.trim();
  const value = Number(trimmed);
  if (trimmed.length === 0 || !Number.isFinite(value)) {
    throw new CliError(`invalid ${label}: ${raw}`);
  }
  return value;
}

/**
 * Parses a token that has to be strictly positive (sizes and radii).
 */
export function parsePositiveNumber(raw: string, label: string): number {
  const value = parseNumber(raw, label);
  if (value <= 0) {
    throw new CliError(`${label} must be positive`);
  }
  return value;
}

/**
 * Renders a number without floating point noise: `1.2000000000000002` becomes
 * `1.2`, `-0` becomes `0`. Rounding keeps saved SVG files stable across
 * scale / unscale round trips.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new CliError(`invalid numeric value: ${String(value)}`);
  }
  const factor = 10 ** DECIMALS;
  const rounded = Math.round(value * factor) / factor;
  if (rounded === 0) {
    return "0";
  }
  return String(rounded);
}
