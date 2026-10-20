import { test } from "node:test";
import assert from "node:assert/strict";

import { Circle } from "../../src/model/Circle";
import { EditorHarness } from "../support/EditorHarness";
import { Group } from "../../src/model/Group";
import { Rect } from "../../src/model/Rect";
import { TextShape } from "../../src/model/TextShape";

test("commands other than init/read require a document", () => {
  const editor = new EditorHarness();
  assert.deepEqual(editor.run("create rect r1 0 0 10 10"), [
    "error: no document. use 'init' or 'read' first",
  ]);
  assert.deepEqual(editor.run("delete r1"), [
    "error: no document. use 'init' or 'read' first",
  ]);
});

test("init uses the 800x600 default and accepts explicit sizes", () => {
  const editor = new EditorHarness();
  assert.deepEqual(editor.run("init"), ["canvas 800x600 created"]);
  assert.equal(editor.session.document.width, 800);
  assert.deepEqual(editor.run("init 1024 768"), ["canvas 1024x768 created"]);
  assert.equal(editor.session.document.width, 1024);
  assert.deepEqual(editor.run("init 0 768"), ["error: width must be positive"]);
  assert.deepEqual(editor.run("init a 768"), ["error: invalid width: a"]);
});

test("create accepts every built-in type", () => {
  const editor = new EditorHarness();
  editor.runLines("init");
  assert.deepEqual(editor.run("create rect r1 10 20 100 50 #eee"), [
    "rect#r1 created",
  ]);
  assert.deepEqual(editor.run("create circle c1 100 100 20 red"), [
    "circle#c1 created",
  ]);
  assert.deepEqual(editor.run("create ellipse e1 5 6 7 8"), [
    "ellipse#e1 created",
  ]);
  assert.deepEqual(editor.run("create line l1 0 0 10 10 black"), [
    "line#l1 created",
  ]);
  assert.deepEqual(editor.run('create text t1 20 40 "My Diagram"'), [
    "text#t1 created",
  ]);
  assert.deepEqual(editor.run("create g g1"), ["g#g1 created"]);

  const document = editor.session.document;
  assert.equal(document.elementCount(), 6);
  assert.ok(document.requireShape("r1") instanceof Rect);
  assert.ok(document.requireShape("c1") instanceof Circle);
  assert.ok(document.requireShape("g1") instanceof Group);
  assert.equal((document.requireShape("t1") as TextShape).content, "My Diagram");
});

test("create rejects unknown types, duplicate ids and bad parameters", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create rect r1 10 20 100 50");
  assert.deepEqual(editor.run("create box n1 10 10 100 50"), [
    "error: unknown shape type: box (is the plugin loaded?)",
  ]);
  assert.deepEqual(editor.run("create rect r1 0 0 10 10"), [
    "error: id already exists: r1",
  ]);
  assert.deepEqual(editor.run("create rect r2 0 0 10"), [
    "error: invalid parameters for create rect (expected 4 or 5 parameters, got 3)",
  ]);
  assert.deepEqual(editor.run("create circle c1 0 0 -5"), [
    "error: r must be positive",
  ]);
  assert.deepEqual(editor.run("create rect r2 0 0 10 10 in g1"), [
    "error: no such container: g1",
  ]);
});

test("delete removes a shape and reports it", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create rect r1 10 20 100 50");
  assert.deepEqual(editor.run("delete r1"), ["rect#r1 deleted"]);
  assert.equal(editor.session.document.elementCount(), 0);
  assert.deepEqual(editor.run("delete r1"), ["error: no such shape: r1"]);
});

test("move reports the resulting position for leaves and the delta for containers", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create rect r1 100 20 10 10",
    "create g g1",
    "create circle c1 0 0 5",
  );
  assert.deepEqual(editor.run("move r1 30 0"), ["rect#r1 moved to (130,20)"]);
  // c1 is a root child, not part of g1 yet.
  assert.deepEqual(editor.run("move g1 0 10"), ["g#g1 moved by (0,10)"]);
  assert.deepEqual(editor.run("move nope 1 1"), ["error: no such shape: nope"]);
  assert.deepEqual(editor.run("move r1 x 1"), ["error: invalid dx: x"]);
});

test("scale multiplies geometry and rejects non positive factors", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create rect r1 10 20 100 50");
  assert.deepEqual(editor.run("scale r1 2"), ["rect#r1 scaled by 2"]);
  const rect = editor.session.document.requireShape("r1") as Rect;
  assert.equal(rect.x, 20);
  assert.equal(rect.width, 200);
  assert.deepEqual(editor.run("scale r1 0"), [
    "error: scale factor must be positive",
  ]);
  assert.deepEqual(editor.run("scale r1 -1"), [
    "error: scale factor must be positive",
  ]);
  assert.equal((editor.session.document.requireShape("r1") as Rect).x, 20);
});

test("set updates whitelisted attributes and echoes the new value", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create text t1 20 40 \"My Diagram\"");
  assert.deepEqual(editor.run('set t1 text "My Diagram v2"'), [
    'text#t1 updated: text="My Diagram v2"',
  ]);
  assert.deepEqual(editor.run("set t1 fill red"), ["text#t1 updated: fill=red"]);
  assert.deepEqual(editor.run("set t1 x 30"), ["text#t1 updated: x=30"]);
  assert.deepEqual(editor.run("set t1 cx 1"), [
    "error: unknown attribute: cx",
  ]);
  assert.deepEqual(editor.run("set nope fill red"), [
    "error: no such shape: nope",
  ]);
  assert.deepEqual(editor.run("set t1 stroke-width wide"), [
    "error: invalid stroke-width: wide",
  ]);
});

test("a failed command does not change the document", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create rect r1 10 20 100 50");
  assert.deepEqual(editor.run("set r1 width -5"), [
    "error: width must be positive",
  ]);
  assert.equal((editor.session.document.requireShape("r1") as Rect).width, 100);
  assert.deepEqual(editor.run("create circle c1 0 0 -5"), [
    "error: r must be positive",
  ]);
  assert.equal(editor.session.document.elementCount(), 1);
});

test("unknown commands are reported", () => {
  const editor = new EditorHarness();
  assert.deepEqual(editor.run("frobnicate"), ["error: unknown command: frobnicate"]);
});

test("exit stops the repl loop", () => {
  const editor = new EditorHarness();
  editor.run("exit");
  assert.equal(editor.session.exitRequested, true);
});

test("comment lines and blank lines produce no output", () => {
  const editor = new EditorHarness();
  assert.deepEqual(editor.run("# a comment"), []);
  assert.deepEqual(editor.run(""), []);
  assert.deepEqual(editor.run("   "), []);
});

test("set applies to container style attributes (composite semantics)", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create g g1", "create rect r1 0 0 10 10 in g1");
  assert.deepEqual(editor.run("set g1 fill red"), ["g#g1 updated: fill=red"]);
  assert.deepEqual(editor.run("tree"), [
    "svg (800x600)",
    "└── g#g1" + " ".repeat(9) + "fill=red",
    "    └── rect#r1" + " ".repeat(2) + "x=0 y=0 w=10 h=10",
  ]);
});
