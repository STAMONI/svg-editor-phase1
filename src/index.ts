/**
 * Entry point of the SVG editor CLI.
 *
 * At this stage the project only contains the scaffold: the entry point prints
 * the banner that the interactive REPL will keep using. The REPL wiring is
 * added in a later stage, on top of the command layer.
 */
const BANNER = "svg-editor 0.1 — type 'help' for commands";

function main(): void {
  process.stdout.write(`${BANNER}\n`);
}

main();
