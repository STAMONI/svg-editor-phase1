#!/usr/bin/env node
/**
 * Version independent test runner.
 *
 * Why not `node --test`?
 * - `node --test` spawns one child process per test file, which fails with
 *   `spawn EPERM` in restricted sandboxes (piped stdio is not available);
 * - `--test-isolation=none` (the workaround used earlier) only exists from
 *   Node 22.8 on, so older Node installations cannot run `npm test` at all.
 *
 * This runner imports every compiled `*.test.js` file into one process. The
 * built-in `node:test` module still reports pass/fail and sets a non-zero exit
 * code on failure, so CI usage is unchanged.
 */
import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const TEST_ROOT = resolve("dist", "test");

if (!existsSync(TEST_ROOT)) {
  console.error('test build missing: run "npm run build" first');
  process.exit(1);
}

/** Collects every *.test.js file below `directory`, sorted for stable output. */
function collect(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collect(path));
    } else if (entry.name.endsWith(".test.js")) {
      files.push(path);
    }
  }
  return files;
}

const testFiles = collect(TEST_ROOT).sort();
if (testFiles.length === 0) {
  console.error(`no *.test.js files found under ${relative(process.cwd(), TEST_ROOT)}`);
  process.exit(1);
}

for (const testFile of testFiles) {
  console.log(`\n# ${relative(process.cwd(), testFile)}`);
  await import(pathToFileURL(testFile).href);
}
