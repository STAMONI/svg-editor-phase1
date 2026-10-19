/**
 * Entry point of the SVG editor CLI.
 *
 * Builds the application (composition root), then hands control to the REPL.
 */
import { EditorApplication } from "./cli/EditorApplication";

function main(): void {
  const application = new EditorApplication((line) => {
    process.stdout.write(`${line}\n`);
  });
  void application.repl.start();
}

main();
