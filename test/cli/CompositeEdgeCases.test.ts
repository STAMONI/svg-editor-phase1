import { test } from "node:test";
import assert from "node:assert/strict";

import { Container } from "../../src/model/Container";
import { Rect } from "../../src/model/Rect";
import { EditorHarness } from "../support/EditorHarness";

function childIds(container: Container): string[] {
  return container.children.map((child) => child.id);
}

test("ungroup promotes children at the container's own position", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create g outer",
    "create rect a 0 0 10 10 in outer",
    "create g g1 in outer",
    "create rect b 0 0 10 10 in g1",
    "create rect c 0 0 10 10 in g1",
    "create rect d 0 0 10 10 in outer",
  );
  const outer = (): Container =>
    editor.session.document.requireShape("outer") as Container;
  assert.deepEqual(childIds(outer()), ["a", "g1", "d"]);
  assert.deepEqual(editor.run("ungroup g1"), ["g#g1 ungrouped (2 children)"]);
  assert.deepEqual(childIds((editor.session.document.requireShape("outer") as Container)), [
    "a",
    "b",
    "c",
    "d",
  ]);
  assert.equal(outer().children[0].parent?.id, "outer");
});

test("group can collect shapes that live in different parents", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create g outer",
    "create rect r1 0 0 10 10 in outer",
    "create rect r2 20 20 10 10",
  );
  assert.deepEqual(editor.run("group g2 r2 r1"), [
    "g#g2 created with 2 children",
  ]);
  const document = editor.session.document;
  assert.deepEqual(childIds(document.canvas), ["outer", "g2"]);
  assert.deepEqual(childIds(document.requireShape("g2") as Container), [
    "r2",
    "r1",
  ]);
  assert.equal(document.requireShape("r1")?.parent?.id, "g2");
  assert.equal((document.requireShape("outer") as Container).children.length, 0);
});

test("addto appends as the last child, preserving the add order", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create g g1",
    "create rect r1 0 0 10 10",
    "create rect r2 0 0 10 10",
  );
  editor.run("addto g1 r2");
  editor.run("addto g1 r1");
  assert.deepEqual(
    childIds(editor.session.document.requireShape("g1") as Container),
    ["r2", "r1"],
  );
});

test("front/back work inside nested containers", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create g g1",
    "create rect r1 0 0 10 10 in g1",
    "create rect r2 0 0 10 10 in g1",
    "create rect r3 0 0 10 10 in g1",
  );
  const groupOf = (): Container =>
    editor.session.document.requireShape("g1") as Container;
  editor.run("front r1");
  assert.deepEqual(editor.session.document.requireShape("g1")?.id, "g1");
  assert.deepEqual(childIds(groupOf()), ["r2", "r3", "r1"]);
  editor.run("back r1");
  assert.deepEqual(childIds(groupOf()), ["r1", "r2", "r3"]);
});

test("scaling a container can be undone as one unit", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create g g1",
    'create rect r1 10 20 30 40 #eee in g1',
    'create text t1 15 25 "hi" in g1',
  );
  assert.deepEqual(editor.run("scale g1 2"), ["g#g1 scaled by 2"]);
  let rect = editor.session.document.requireShape("r1") as Rect;
  assert.equal(rect.x, 20);
  assert.equal(rect.width, 60);

  assert.deepEqual(editor.run("undo"), ["g#g1 scaled back"]);
  rect = editor.session.document.requireShape("r1") as Rect;
  assert.equal(rect.x, 10);
  assert.equal(rect.width, 30);
  assert.equal(editor.session.document.requireShape("t1")?.contentText(), "hi");
});

test("deeply nested groups keep parents and structure through delete/undo", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create g a",
    "create g b in a",
    "create g c in b",
    "create rect r 1 2 3 4 in c",
  );
  assert.deepEqual(
    (
      (
        (editor.session.document.requireShape("a") as Container)
          .children[0] as Container
      ).children[0] as Container
    ).children.map((child) => child.id),
    ["r"],
  );
  assert.equal(editor.session.document.requireShape("r")?.parent?.id, "c");

  editor.run("delete a");
  assert.equal(editor.session.document.elementCount(), 0);
  assert.deepEqual(editor.run("undo"), ["g#a restored"]);
  assert.equal(editor.session.document.requireShape("r")?.parent?.id, "c");
  assert.equal(editor.session.document.elementCount(), 4);
});
