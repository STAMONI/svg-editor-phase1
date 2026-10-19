import { CommandLineParser } from "../commands/CommandLineParser";
import { CommandRegistry } from "../commands/CommandRegistry";
import { EditorSession } from "../commands/EditorSession";
import { InitCommand } from "../commands/document/InitCommand";
import { AddToCommand } from "../commands/edit/AddToCommand";
import { BackCommand } from "../commands/edit/BackCommand";
import { CreateCommand } from "../commands/edit/CreateCommand";
import { DeleteCommand } from "../commands/edit/DeleteCommand";
import { FrontCommand } from "../commands/edit/FrontCommand";
import { GroupCommand } from "../commands/edit/GroupCommand";
import { MoveCommand } from "../commands/edit/MoveCommand";
import { ScaleCommand } from "../commands/edit/ScaleCommand";
import { SetCommand } from "../commands/edit/SetCommand";
import { UngroupCommand } from "../commands/edit/UngroupCommand";
import { ShapeFactory } from "../commands/factories/ShapeFactory";
import { ExitCommand } from "../commands/system/ExitCommand";
import { Repl } from "./Repl";

/**
 * Composition root: wires the session, the command registry and the REPL.
 *
 * This is the only place that knows about all concrete commands; tests build
 * the same application with a captured output sink.
 */
export class EditorApplication {
  public readonly session: EditorSession;
  public readonly registry: CommandRegistry;
  public readonly parser: CommandLineParser;
  public readonly repl: Repl;

  public constructor(out: (line: string) => void) {
    const factory = new ShapeFactory();
    this.session = new EditorSession();
    this.registry = new CommandRegistry([
      new InitCommand(),
      new CreateCommand(factory),
      new DeleteCommand(),
      new MoveCommand(),
      new ScaleCommand(),
      new SetCommand(),
      new GroupCommand(),
      new UngroupCommand(),
      new AddToCommand(),
      new FrontCommand(),
      new BackCommand(),
      new ExitCommand(),
    ]);
    this.parser = new CommandLineParser();
    this.repl = new Repl(this.session, this.registry, this.parser, out);
  }
}
