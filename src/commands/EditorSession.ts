import { CliError } from "../errors/CliError";
import { UndoManager } from "../history/UndoManager";
import type { SvgDocument } from "../model/SvgDocument";
import type { Command } from "./Command";

/**
 * Invoker of the Command pattern and owner of the current document.
 *
 * Responsibilities:
 * - holds the single current document (and the path it was read from / saved to);
 * - runs a command inside a transactional envelope: any thrown error restores
 *   the state observed before the call, so a failed command changes nothing;
 * - records exactly one history unit per successful edit command;
 * - locks undo/redo after document level commands (init / read / save / canvas).
 *
 * Commands themselves never manage snapshots or history.
 */
export class EditorSession {
  private currentDocument: SvgDocument | null = null;
  private currentFilePath: string | null = null;
  private exitRequestedFlag = false;
  private readonly historyManager = new UndoManager();

  /** @throws CliError `no document. use 'init' or 'read' first` */
  public get document(): SvgDocument {
    if (this.currentDocument === null) {
      throw new CliError("no document. use 'init' or 'read' first");
    }
    return this.currentDocument;
  }

  public get hasDocument(): boolean {
    return this.currentDocument !== null;
  }

  /** Path used by `save` without arguments and by the read/save feedback. */
  public get currentPath(): string | null {
    return this.currentFilePath;
  }

  public setDocument(document: SvgDocument, path: string | null): void {
    this.currentDocument = document;
    this.currentFilePath = path;
  }

  public requestExit(): void {
    this.exitRequestedFlag = true;
  }

  public get exitRequested(): boolean {
    return this.exitRequestedFlag;
  }

  /**
   * Runs one command with rollback on failure and history bookkeeping.
   *
   * @throws CliError when the command reports a user error
   */
  public execute(command: Command, args: readonly string[]): readonly string[] {
    if (command.requiresDocument && !this.hasDocument) {
      throw new CliError("no document. use 'init' or 'read' first");
    }
    const category =
      command.categoryFor === undefined
        ? command.category
        : command.categoryFor(args);
    const documentBefore = this.currentDocument;
    const pathBefore = this.currentFilePath;
    const snapshotBefore =
      documentBefore === null ? null : documentBefore.snapshot();
    try {
      const result = command.run(args, this);
      this.updateHistory(category, snapshotBefore, result.lines, result.undoLines);
      return result.lines;
    } catch (error) {
      this.currentDocument = snapshotBefore ?? documentBefore;
      this.currentFilePath = pathBefore;
      throw CliError.normalize(error);
    }
  }

  /** Undoes the last edit unit; returns the undo feedback lines. */
  public undo(): readonly string[] {
    this.document;
    const entry = this.historyManager.undo();
    this.currentDocument = entry.before;
    return entry.undoLines.length > 0 ? entry.undoLines : ["undo completed"];
  }

  /** Redoes the last undone edit unit; returns the redo feedback lines. */
  public redo(): readonly string[] {
    this.document;
    const entry = this.historyManager.redo();
    this.currentDocument = entry.after;
    return entry.redoLines.length > 0 ? entry.redoLines : ["redo completed"];
  }

  private updateHistory(
    category: "document" | "edit" | "query" | "history",
    before: SvgDocument | null,
    lines: readonly string[],
    undoLines: readonly string[] | undefined,
  ): void {
    if (category === "document") {
      this.historyManager.resetAndLock();
      return;
    }
    if (category !== "edit" || before === null) {
      return;
    }
    this.historyManager.record({
      before,
      after: this.document.snapshot(),
      undoLines: undoLines ?? [],
      redoLines: lines,
    });
  }
}
