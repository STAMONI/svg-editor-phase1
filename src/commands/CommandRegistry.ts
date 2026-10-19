import { CliError } from "../errors/CliError";
import type { Command } from "./Command";

/**
 * Dispatcher: maps a command word to its Command instance.
 *
 * This is one of the two allowed "dispatch by name" points in the system (the
 * other one is ShapeFactory). It is a pure lookup table, not a behaviour
 * switch: concrete commands stay independent of each other.
 */
export class CommandRegistry {
  private readonly commandsByName = new Map<string, Command>();

  public constructor(commands: readonly Command[]) {
    for (const command of commands) {
      this.register(command);
    }
  }

  public register(command: Command): void {
    if (this.commandsByName.has(command.name)) {
      throw new Error(`command already registered: ${command.name}`);
    }
    this.commandsByName.set(command.name, command);
  }

  /** @throws CliError `unknown command: <name>` */
  public resolve(name: string): Command {
    const command = this.commandsByName.get(name);
    if (command === undefined) {
      throw new CliError(`unknown command: ${name}`);
    }
    return command;
  }

  public all(): readonly Command[] {
    return [...this.commandsByName.values()];
  }
}
