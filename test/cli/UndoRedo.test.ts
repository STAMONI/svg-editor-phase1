import { test } from "node:test";
import assert from "node:assert/strict";

import { Container } from "../../src/model/Container";
import { Rect } from "../../src/model/Rect";
import { EditorHarness } from "../support/EditorHarness";

test("undo/redo are forbidden after init until the next edit", () => {
  const editor = new EditorHarness();
  editor.run("init");
  assert.deepEqual(editor.run("undo"), [
    "error: undo not allowed after io command",
  ]);
  assert.deepEqual(editor.run("redo"), [
    "error: redo not allowed after io command",
  ]);
  editor.run("create rect r1 100 20 10 10");
  assert.deepEqual(editor.run("undo"), ["rect#r1 removed"]);
});

test("create can be undone and redone", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create rect r1 10 20 100 50");
  assert.deepEqual(editor.run("undo"), ["rect#r1 removed"]);
  assert.equal(editor.session.document.elementCount(), 0);
  assert.deepEqual(editor.run("redo"), ["rect#r1 created"]);
  assert.equal(editor.session.document.elementCount(), 1);
});

test("move undo/redo restores the previous position", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create rect r1 100 20 10 10");
  assert.deepEqual(editor.run("move r1 30 0"), ["rect#r1 moved to (130,20)"]);
  assert.deepEqual(editor.run("undo"), ["rect#r1 moved back to (100,20)"]);
  assert.equal((editor.session.document.requireShape("r1") as Rect).x, 100);
  assert.deepEqual(editor.run("redo"), ["rect#r1 moved to (130,20)"]);
  assert.equal((editor.session.document.requireShape("r1") as Rect).x, 130);
});

test("container move undo reports the inverse delta", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create g g1", "create rect r1 0 0 10 10 in g1");
  assert.deepEqual(editor.run("move g1 0 100"), ["g#g1 moved by (0,100)"]);
  assert.deepEqual(editor.run("undo"), ["g#g1 moved back by (0,-100)"]);
  assert.equal((editor.session.document.requireShape("r1") as Rect).y, 0);
});

test("delete undo restores the subtree into its former container", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create g markers",
    "create rect r1 0 0 10 10 in markers",
  );
  assert.deepEqual(editor.run("delete r1"), ["rect#r1 deleted"]);
  assert.deepEqual(editor.run("undo"), [
    "rect#r1 restored into g#markers",
  ]);
  assert.equal(editor.session.document.requireShape("r1")?.parent?.id, "markers");
});

test("group is one undo unit", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create rect a 0 0 10 10",
    "create circle b 0 0 5",
    "group g1 a b",
  );
  assert.deepEqual(editor.run("undo"), ["g#g1 dissolved"]);
  assert.deepEqual(
    editor.session.document.canvas.children.map((child) => child.id),
    ["a", "b"],
  );
  assert.deepEqual(editor.run("redo"), ["g#g1 created with 2 children"]);
  // undo/redo swap in snapshot documents, so always re-read the current one.
  const restored = editor.session.document;
  assert.deepEqual(
    (restored.canvas.children[0] as Container).children.map((child) => child.id),
    ["a", "b"],
  );
});

test("a new edit clears the redo stack", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create rect r1 0 0 10 10");
  editor.run("undo");
  editor.run("create circle c1 0 0 5");
  assert.deepEqual(editor.run("redo"), ["error: nothing to redo"]);
});

test("document commands lock history and the next edit re-enables it", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create rect r1 0 0 10 10", "save out.svg");
  assert.deepEqual(editor.run("undo"), [
    "error: undo not allowed after io command",
  ]);
  editor.run("create circle c1 0 0 5");
  assert.deepEqual(editor.run("undo"), ["circle#c1 removed"]);
  assert.deepEqual(editor.run("undo"), ["error: nothing to undo"]);
});

test("canvas query does not lock history, canvas resize does", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create rect r1 0 0 10 10");
  assert.deepEqual(editor.run("canvas"), ["canvas 800x600"]);
  assert.deepEqual(editor.run("undo"), ["rect#r1 removed"]);
  editor.run("redo");
  assert.deepEqual(editor.run("canvas 1024 768"), [
    "canvas resized to 1024x768",
  ]);
  assert.deepEqual(editor.run("undo"), [
    "error: undo not allowed after io command",
  ]);
});

test("failed commands are not recorded in the history", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create rect r1 0 0 10 10");
  assert.deepEqual(editor.run("set r1 width -5"), [
    "error: width must be positive",
  ]);
  assert.deepEqual(editor.run("undo"), ["rect#r1 removed"]);
});

test("undo/redo with nothing to restore reports a clear error", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create rect r1 0 0 10 10", "undo");
  assert.deepEqual(editor.run("undo"), ["error: nothing to undo"]);
});
