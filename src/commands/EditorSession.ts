import { asCliError, CliError } from "../errors/CliError";
import type { SvgDocument } from "../model/SvgDocument";
import type { Command } from "./Command";

/**
 * Invoker of the Command pattern and owner of the current document.
 *
 * Responsibilities:
 * - holds the single current document (and the path it was read from / saved to);
 * - runs a command inside a transactional envelope: any thrown error restores
 *   the state observed before the call, so a failed command changes nothing;
 * - (from the undo stage on) records one history unit per successful edit.
 *
 * Commands themselves never manage snapshots or history.
 */
export class EditorSession {
  private currentDocument: SvgDocument | null = null;
  private currentFilePath: string | null = null;
  private exitRequestedFlag = false;

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
   * Runs one command with rollback on failure.
   *
   * @throws CliError when the command reports a user error
   */
  public execute(command: Command, args: readonly string[]): readonly string[] {
    if (command.requiresDocument && !this.hasDocument) {
      throw new CliError("no document. use 'init' or 'read' first");
    }
    const documentBefore = this.currentDocument;
    const pathBefore = this.currentFilePath;
    const snapshotBefore =
      documentBefore === null ? null : documentBefore.snapshot();
    try {
      const result = command.run(args, this);
      return result.lines;
    } catch (error) {
      this.currentDocument = snapshotBefore ?? documentBefore;
      this.currentFilePath = pathBefore;
      throw asCliError(error);
    }
  }
}
