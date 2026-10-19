/**
 * Abstraction over the file system so the IO layer can be tested without
 * touching the disk and so another storage backend could be plugged in later.
 */
export interface TextFileSystem {
  /** @throws when the file cannot be read */
  readTextFile(path: string): string;
  /** @throws when the file cannot be written */
  writeTextFile(path: string, content: string): void;
}
