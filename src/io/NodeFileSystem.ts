import { readFileSync, writeFileSync } from "node:fs";

import type { TextFileSystem } from "./TextFileSystem";

/** Real file system access used by the CLI. */
export class NodeFileSystem implements TextFileSystem {
  public readTextFile(path: string): string {
    return readFileSync(path, "utf8");
  }

  public writeTextFile(path: string, content: string): void {
    writeFileSync(path, content, "utf8");
  }
}
