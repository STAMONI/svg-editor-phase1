import { CommandLineParser } from "../commands/CommandLineParser";
import { CommandRegistry } from "../commands/CommandRegistry";
import { EditorSession } from "../commands/EditorSession";
import { CanvasCommand } from "../commands/document/CanvasCommand";
import { InitCommand } from "../commands/document/InitCommand";
import { ReadCommand } from "../commands/document/ReadCommand";
import { SaveCommand } from "../commands/document/SaveCommand";
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
import { RedoCommand } from "../commands/history/RedoCommand";
import { UndoCommand } from "../commands/history/UndoCommand";
import { HelpCommand } from "../commands/query/HelpCommand";
import { ShowCommand } from "../commands/query/ShowCommand";
import { TreeCommand } from "../commands/query/TreeCommand";
import { ExitCommand } from "../commands/system/ExitCommand";
import { NodeFileSystem } from "../io/NodeFileSystem";
import { SvgReader } from "../io/SvgReader";
import { SvgWriter } from "../io/SvgWriter";
import type { TextFileSystem } from "../io/TextFileSystem";
import { Repl } from "./Repl";

/**
 * Composition root: wires the session, the command registry and the REPL.
 *
 * This is the only place that knows about all concrete commands; tests build
 * the same application with a captured output sink and an in-memory file
 * system.
 */
export class EditorApplication {
  public readonly session: EditorSession;
  public readonly registry: CommandRegistry;
  public readonly parser: CommandLineParser;
  public readonly repl: Repl;

  public constructor(
    out: (line: string) => void,
    fileSystem: TextFileSystem = new NodeFileSystem(),
  ) {
    const factory = new ShapeFactory();
    const reader = new SvgReader(fileSystem);
    const writer = new SvgWriter(fileSystem);
    this.session = new EditorSession();
    this.registry = new CommandRegistry([
      new InitCommand(),
      new ReadCommand(reader),
      new SaveCommand(writer),
      new CanvasCommand(),
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
      new TreeCommand(),
      new ShowCommand(),
      new UndoCommand(),
      new RedoCommand(),
      new ExitCommand(),
    ]);
    // `help` needs the registry itself, so it is registered afterwards.
    this.registry.register(new HelpCommand(this.registry));
    this.parser = new CommandLineParser();
    this.repl = new Repl(this.session, this.registry, this.parser, out);
  }
}
