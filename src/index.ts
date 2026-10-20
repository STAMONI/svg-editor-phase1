/**
 * Entry point of the SVG editor CLI.
 *
 * Usage:
 * - `npm run cli` (or `node dist/src/index.js`): interactive REPL, prompt `svg> `;
 * - `node dist/src/index.js script.txt`: replays the commands of a script file
 *   (blank lines and `#` comments are ignored), which is handy for demos.
 */
import { readFileSync } from "node:fs";

import { EditorApplication } from "./cli/EditorApplication";

/** Exits quietly when the output pipe is closed early (e.g. `... | head`). */
process.stdout.on("error", (error: Error) => {
  if ((error as NodeJS.ErrnoException).code === "EPIPE") {
    process.exit(0);
  }
});

function runScript(application: EditorApplication, scriptPath: string): void {
  let content: string;
  try {
    content = readFileSync(scriptPath, "utf8");
  } catch {
    process.stdout.write(`error: cannot read file: ${scriptPath}\n`);
    process.exitCode = 1;
    return;
  }
  for (const line of content.split(/\r?\n/)) {
    application.repl.executeLine(line);
    if (application.session.exitRequested) {
      break;
    }
  }
}

function main(): void {
  const application = new EditorApplication((line) => {
    process.stdout.write(`${line}\n`);
  });
  const scriptPath = process.argv[2];
  if (scriptPath !== undefined) {
    runScript(application, scriptPath);
    return;
  }
  void application.repl.start();
}

main();
