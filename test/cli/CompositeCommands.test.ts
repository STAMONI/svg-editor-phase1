import { test } from "node:test";
import assert from "node:assert/strict";

import { Container } from "../../src/model/Container";
import { EditorHarness } from "../support/EditorHarness";

function childIds(container: Container): string[] {
  return container.children.map((child) => child.id);
}

test("create supports the in <containerId> clause", () => {
  const editor = new EditorHarness();
  assert.deepEqual(
    editor.runLines(
      "init 800 600",
      "create g flowchart",
      "create g node1 in flowchart",
      'create rect start 120 100 160 60 #4a90d9 in node1',
      'create text start-label 155 135 "开始" in node1',
    ),
    [
      "canvas 800x600 created",
      "g#flowchart created",
      "g#node1 created in g#flowchart",
      "rect#start created in g#node1",
      "text#start-label created in g#node1",
    ],
  );
  const document = editor.session.document;
  const flowchart = document.requireShape("flowchart") as Container;
  assert.deepEqual(childIds(flowchart), ["node1"]);
  assert.deepEqual(childIds(document.requireShape("node1") as Container), [
    "start",
    "start-label",
  ]);
});

test("in clause validates the container", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create g g1", "create rect r1 0 0 10 10");
  assert.deepEqual(editor.run("create rect r2 0 0 10 10 in missing"), [
    "error: no such container: missing",
  ]);
  assert.deepEqual(editor.run("create rect r2 0 0 10 10 in r1"), [
    "error: not a container: r1",
  ]);
  assert.equal(editor.session.document.elementCount(), 2);
});

test("group creates a container at the position of the first shape", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create rect a 0 0 10 10",
    "create circle b 0 0 5",
    "create rect c 10 10 10 10",
  );
  assert.deepEqual(editor.run("group g1 a c"), [
    "g#g1 created with 2 children",
  ]);
  const document = editor.session.document;
  assert.deepEqual(document.canvas.children.map((child) => child.id), [
    "g1",
    "b",
  ]);
  assert.deepEqual(childIds(document.requireShape("g1") as Container), [
    "a",
    "c",
  ]);
});

test("group rejects duplicated ids and ancestor conflicts", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create rect a 0 0 10 10",
    "create g outer",
    "create circle c 0 0 5 in outer",
  );
  assert.deepEqual(editor.run("group g1 a a"), [
    "error: duplicate shape in group: a",
  ]);
  assert.deepEqual(editor.run("group g1 c outer"), [
    "error: cannot group a container into its own descendant: outer",
  ]);
  assert.deepEqual(editor.run("group a b"), [
    "error: invalid parameters for group (expected: group <newGid> <id1> <id2>…)",
  ]);
});

test("ungroup promotes children in order and rejects invalid targets", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create g outer",
    "create g inner in outer",
    "create rect r1 0 0 10 10 in inner",
    "create circle c1 0 0 5 in inner",
  );
  assert.deepEqual(editor.run("ungroup inner"), [
    "g#inner ungrouped (2 children)",
  ]);
  const outer = editor.session.document.requireShape("outer") as Container;
  assert.deepEqual(childIds(outer), ["r1", "c1"]);

  assert.deepEqual(editor.run("ungroup r1"), ["error: not a container: r1"]);
  assert.deepEqual(editor.run("ungroup outer"), [
    "error: cannot ungroup top-level container: outer",
  ]);
  assert.deepEqual(editor.run("ungroup missing"), [
    "error: no such shape: missing",
  ]);
});

test("addto moves an existing shape into a container", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create g markers",
    "create rect r1 0 0 10 10",
    "create circle c1 0 0 5",
  );
  assert.deepEqual(editor.run("addto markers r1"), [
    "rect#r1 added to g#markers",
  ]);
  const document = editor.session.document;
  assert.equal(document.requireShape("r1")?.parent?.id, "markers");
  assert.deepEqual(childIds(document.requireShape("markers") as Container), [
    "r1",
  ]);
  assert.deepEqual(editor.run("addto nope r1"), [
    "error: no such container: nope",
  ]);
  assert.deepEqual(editor.run("addto r1 c1"), [
    "error: not a container: r1",
  ]);
});

test("addto rejects cycles", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create g outer",
    "create g inner in outer",
    "create rect r1 0 0 10 10 in inner",
  );
  assert.deepEqual(editor.run("addto inner outer"), [
    "error: cannot add a container into its own descendant: outer",
  ]);
  assert.deepEqual(editor.run("addto outer outer"), [
    "error: cannot add a container into its own descendant: outer",
  ]);
});

test("front and back reorder siblings and undo safely", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create rect a 0 0 10 10",
    "create circle b 0 0 5",
    "create line c 0 0 10 10",
  );
  const document = editor.session.document;
  assert.deepEqual(editor.run("front a"), ["rect#a moved to front"]);
  assert.deepEqual(document.canvas.children.map((child) => child.id), [
    "b",
    "c",
    "a",
  ]);
  assert.deepEqual(editor.run("back a"), ["rect#a moved to back"]);
  assert.deepEqual(document.canvas.children.map((child) => child.id), [
    "a",
    "b",
    "c",
  ]);
});

test("deleting a container removes its whole subtree", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create g outer",
    "create g inner in outer",
    "create rect r1 0 0 10 10 in inner",
  );
  assert.equal(editor.session.document.elementCount(), 3);
  assert.deepEqual(editor.run("delete outer"), ["g#outer deleted"]);
  assert.equal(editor.session.document.elementCount(), 0);
});
