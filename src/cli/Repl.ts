import * as readline from "node:readline";

import { asCliError } from "../errors/CliError";
import type { CommandLineParser } from "../commands/CommandLineParser";
import type { CommandRegistry } from "../commands/CommandRegistry";
import type { EditorSession } from "../commands/EditorSession";

export const BANNER = "svg-editor 0.1 — type 'help' for commands";
export const PROMPT = "svg> ";

/**
 * Interactive terminal front end.
 *
 * The REPL only parses lines, dispatches to the registry and prints the lines
 * returned by the session. All domain behaviour stays in the command layer.
 *
 * Works both interactively (prompt `svg> `) and with piped input, which makes
 * scripted demos and automated tests possible without a TTY.
 */
export class Repl {
  public constructor(
    private readonly session: EditorSession,
    private readonly registry: CommandRegistry,
    private readonly parser: CommandLineParser,
    private readonly out: (line: string) => void,
  ) {}

  /** Runs one line, printing feedback or `error: ...`. */
  public executeLine(line: string): void {
    let parsed;
    try {
      parsed = this.parser.parse(line);
    } catch (error) {
      this.out(`error: ${asCliError(error).message}`);
      return;
    }
    if (parsed === null) {
      return;
    }
    try {
      const command = this.registry.resolve(parsed.name);
      const lines = this.session.execute(command, parsed.args);
      for (const line of lines) {
        this.out(line);
      }
    } catch (error) {
      this.out(`error: ${asCliError(error).message}`);
    }
  }

  /** Starts reading input until EOF or the `exit` command. */
  public async start(): Promise<void> {
    this.out(BANNER);
    this.out("");

    const interactive = process.stdin.isTTY === true;
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: interactive,
    });

    if (interactive) {
      rl.setPrompt(PROMPT);
      rl.prompt();
    }
    for await (const line of rl) {
      this.executeLine(line);
      if (this.session.exitRequested) {
        break;
      }
      if (interactive) {
        rl.prompt();
      }
    }
    rl.close();
  }
}
