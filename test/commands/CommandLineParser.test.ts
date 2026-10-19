import { test } from "node:test";
import assert from "node:assert/strict";

import { CommandLineParser } from "../../src/commands/CommandLineParser";
import { CliError } from "../../src/errors/CliError";

test("parser splits whitespace separated tokens", () => {
  const parser = new CommandLineParser();
  assert.deepEqual(parser.parse("create rect r1 10 20 100 50"), {
    name: "create",
    args: ["rect", "r1", "10", "20", "100", "50"],
  });
});

test("parser keeps double quoted text as one token", () => {
  const parser = new CommandLineParser();
  assert.deepEqual(parser.parse('set t1 text "My Diagram v2"'), {
    name: "set",
    args: ["t1", "text", "My Diagram v2"],
  });
});

test("parser ignores blank lines and # comments", () => {
  const parser = new CommandLineParser();
  assert.equal(parser.parse(""), null);
  assert.equal(parser.parse("   "), null);
  assert.equal(parser.parse("# this is a comment"), null);
});

test("parser rejects unterminated quotes", () => {
  const parser = new CommandLineParser();
  assert.throws(
    () => parser.parse('create text t1 10 20 "oops'),
    (error: unknown) =>
      error instanceof CliError && error.message === "unterminated quote in command",
  );
});

test("parser supports escaped quotes inside quoted text", () => {
  const parser = new CommandLineParser();
  assert.deepEqual(parser.parse('set t1 text "say \\"hi\\""'), {
    name: "set",
    args: ["t1", "text", 'say "hi"'],
  });
});
