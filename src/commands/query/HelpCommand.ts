import { CliError } from "../../errors/CliError";
import type { Command, CommandCategory, CommandResult } from "../Command";
import type { CommandRegistry } from "../CommandRegistry";
import type { EditorSession } from "../EditorSession";

const CATEGORY_ORDER: readonly { readonly key: CommandCategory; readonly title: string }[] = [
  { key: "document", title: "document commands" },
  { key: "edit", title: "edit commands" },
  { key: "query", title: "display commands" },
  { key: "history", title: "undo / redo" },
];

/**
 * `help` — lists every registered command with its syntax and description.
 *
 * The list is generated from the registry, so a new command shows up
 * automatically and the registry stays the single source of truth.
 */
export class HelpCommand implements Command {
  public readonly name = "help";
  public readonly syntax = "help";
  public readonly description = "list every command with its syntax";
  public readonly category = "query" as const;
  public readonly requiresDocument = false;

  public constructor(private readonly registry: CommandRegistry) {}

  public run(
    args: readonly string[],
    _session: EditorSession,
  ): CommandResult {
    if (args.length !== 0) {
      throw new CliError(`invalid parameters for help (expected: ${this.syntax})`);
    }
    const lines: string[] = ["commands:"];
    for (const group of CATEGORY_ORDER) {
      const commands = this.registry
        .all()
        .filter((command) => command.category === group.key);
      if (commands.length === 0) {
        continue;
      }
      lines.push(`  ${group.title}`);
      const commandWidth = commands.reduce(
        (max, command) => Math.max(max, command.syntax.length),
        0,
      ) + 2;
      for (const command of commands) {
        lines.push(
          `    ${command.syntax.padEnd(commandWidth)}${command.description}`,
        );
      }
    }
    lines.push("  notes");
    lines.push("    # starts a comment line; quoted \"text content\" is one argument");
    lines.push("    'exit' leaves the REPL");
    return { lines };
  }
}
