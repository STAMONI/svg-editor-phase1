import type { TextFileSystem } from "../../src/io/TextFileSystem";

/** In-memory file system used by the automated tests (no disk access). */
export class InMemoryFileSystem implements TextFileSystem {
  private readonly files = new Map<string, string>();
  private failWrites = false;

  public readTextFile(path: string): string {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`ENOENT: no such file: ${path}`);
    }
    return content;
  }

  public writeTextFile(path: string, content: string): void {
    if (this.failWrites) {
      throw new Error(`EACCES: cannot write ${path}`);
    }
    this.files.set(path, content);
  }

  /** Seeds a file without going through the write path. */
  public putFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  public getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  public failAllWrites(): void {
    this.failWrites = true;
  }
}
