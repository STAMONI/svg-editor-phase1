import { EditorApplication } from "../../src/cli/EditorApplication";
import { InMemoryFileSystem } from "./InMemoryFileSystem";

/**
 * Test harness: builds the real application (same composition root as the CLI)
 * with an in-memory file system, and captures every printed line.
 */
export class EditorHarness {
  private readonly application: EditorApplication;
  private readonly output: string[] = [];
  public readonly fileSystem: InMemoryFileSystem;

  public constructor(fileSystem: InMemoryFileSystem = new InMemoryFileSystem()) {
    this.fileSystem = fileSystem;
    this.application = new EditorApplication((line) => {
      this.output.push(line);
    }, fileSystem);
  }

  /** Runs one input line and returns the lines printed for it. */
  public run(line: string): string[] {
    const start = this.output.length;
    this.application.repl.executeLine(line);
    return this.output.slice(start);
  }

  /** Runs several input lines, concatenating all printed lines. */
  public runLines(...lines: readonly string[]): string[] {
    const printed: string[] = [];
    for (const line of lines) {
      printed.push(...this.run(line));
    }
    return printed;
  }

  public get session() {
    return this.application.session;
  }
}
