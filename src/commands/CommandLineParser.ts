import { CliError } from "../errors/CliError";

/** One parsed input line. */
export interface ParsedCommand {
  readonly name: string;
  readonly args: readonly string[];
}

/**
 * Turns one REPL line into command name plus arguments.
 *
 * Rules from the assignment: whitespace separated tokens, double quotes group
 * tokens with spaces (mainly `text` content), `#` at the beginning of a line
 * is a comment, and blank lines are ignored.
 */
export class CommandLineParser {
  /** @returns null for blank lines and comments. */
  public parse(line: string): ParsedCommand | null {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      return null;
    }
    const tokens = CommandLineParser.tokenize(trimmed);
    if (tokens.length === 0) {
      return null;
    }
    const [name, ...args] = tokens;
    return { name, args };
  }

  /** @throws CliError `unterminated quote in command` */
  private static tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let hasContent = false;
    let quoted = false;

    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];
      if (quoted) {
        if (char === "\\" && index + 1 < input.length) {
          const next = input[index + 1];
          if (next === '"' || next === "\\") {
            current += next;
            index += 1;
          } else {
            current += char;
          }
        } else if (char === '"') {
          quoted = false;
        } else {
          current += char;
        }
        continue;
      }
      if (char === '"') {
        quoted = true;
        hasContent = true;
      } else if (char === " " || char === "\t" || char === "\r") {
        if (hasContent) {
          tokens.push(current);
          current = "";
          hasContent = false;
        }
      } else {
        current += char;
        hasContent = true;
      }
    }

    if (quoted) {
      throw new CliError("unterminated quote in command");
    }
    if (hasContent) {
      tokens.push(current);
    }
    return tokens;
  }
}
