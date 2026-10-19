import { CliError } from "../errors/CliError";
import type { SvgDocument } from "../model/SvgDocument";

/** One undo unit: the document before/after an edit plus its feedback lines. */
export interface HistoryEntry {
  readonly before: SvgDocument;
  readonly after: SvgDocument;
  readonly undoLines: readonly string[];
  readonly redoLines: readonly string[];
}

/**
 * Snapshot based undo/redo (Memento pattern).
 *
 * "One edit command = one undo unit" is guaranteed by the invoke site
 * (EditorSession): a command either records exactly one entry or none at all.
 *
 * Document level commands (init / read / save / canvas resize) call
 * `resetAndLock()`: undo/redo is forbidden until the next edit command, which
 * re-enables the feature through `record()`.
 */
export class UndoManager {
  private readonly undoStack: HistoryEntry[] = [];
  private readonly redoStack: HistoryEntry[] = [];
  private locked = false;

  /** Clears the history and forbids undo/redo until the next edit. */
  public resetAndLock(): void {
    this.locked = true;
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  /** Records one edit unit, unlocks undo/redo and drops the redo stack. */
  public record(entry: HistoryEntry): void {
    this.locked = false;
    this.undoStack.push(entry);
    this.redoStack.length = 0;
  }

  public get canUndo(): boolean {
    return !this.locked && this.undoStack.length > 0;
  }

  public get canRedo(): boolean {
    return !this.locked && this.redoStack.length > 0;
  }

  /** @throws CliError for locked history or an empty stack */
  public undo(): HistoryEntry {
    this.assertUnlocked("undo");
    const entry = this.undoStack.pop();
    if (entry === undefined) {
      throw new CliError("nothing to undo");
    }
    this.redoStack.push(entry);
    return entry;
  }

  /** @throws CliError for locked history or an empty stack */
  public redo(): HistoryEntry {
    this.assertUnlocked("redo");
    const entry = this.redoStack.pop();
    if (entry === undefined) {
      throw new CliError("nothing to redo");
    }
    this.undoStack.push(entry);
    return entry;
  }

  private assertUnlocked(action: "undo" | "redo"): void {
    if (this.locked) {
      throw new CliError(`${action} not allowed after io command`);
    }
  }
}
