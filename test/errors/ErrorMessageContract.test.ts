import { test } from "node:test";
import assert from "node:assert/strict";

import { Container } from "../../src/model/Container";
import type { ShapeType } from "../../src/model/ShapeType";
import { EditorHarness } from "../support/EditorHarness";

/**
 * Test-only stand-in for the plugin composite type of the next phase (`box`).
 *
 * It proves that the kernel already refuses to dissolve plugin owned
 * structures, without adding a non-required shape type to this phase.
 */
class FakePluginComposite extends Container {
  public constructor(id: string) {
    super(id);
  }

  public override get type(): ShapeType {
    return "g";
  }

  public override get tagName(): string {
    return "g";
  }

  public override get isPluginComposite(): boolean {
    return true;
  }

  protected override createEmptyContainer(): Container {
    return new FakePluginComposite(this.id);
  }
}

test("document and shape errors use the exact contract messages", () => {
  const editor = new EditorHarness();

  // no document yet
  assert.deepEqual(editor.run("create rect r1 0 0 10 10"), [
    "error: no document. use 'init' or 'read' first",
  ]);

  editor.runLines("init", "create rect r1 0 0 10 10");
  assert.deepEqual(editor.run("create rect r1 0 0 10 10"), [
    "error: id already exists: r1",
  ]);
  assert.deepEqual(editor.run("move r9 1 1"), ["error: no such shape: r9"]);
  assert.deepEqual(editor.run("delete r9"), ["error: no such shape: r9"]);
  assert.deepEqual(editor.run("set r9 fill red"), ["error: no such shape: r9"]);

  // `in` clause diagnostics
  assert.deepEqual(editor.run("create rect r2 0 0 10 10 in node9"), [
    "error: no such container: node9",
  ]);
  assert.deepEqual(editor.run("create rect r2 0 0 10 10 in r1"), [
    "error: not a container: r1",
  ]);

  // unknown shape type (box belongs to the plugin phase and stays unimplemented)
  assert.deepEqual(editor.run("create box b1 0 0 10 10"), [
    "error: unknown shape type: box (is the plugin loaded?)",
  ]);
  assert.deepEqual(editor.run("create hexagon h1"), [
    "error: unknown shape type: hexagon (is the plugin loaded?)",
  ]);

  assert.deepEqual(editor.run("scale r1 0"), [
    "error: scale factor must be positive",
  ]);
  assert.deepEqual(editor.run("set r1 opacity 1"), [
    "error: unknown attribute: opacity",
  ]);
});

test("composite errors use the exact contract messages", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create g g1",
    "create circle c1 0 0 5 in g1",
    "create g scene",
  );

  assert.deepEqual(editor.run("group g2 c1 g1"), [
    "error: cannot group a container into its own descendant: g1",
  ]);
  assert.deepEqual(editor.run("ungroup scene"), [
    "error: cannot ungroup top-level container: scene",
  ]);
  assert.deepEqual(editor.run("ungroup c1"), ["error: not a container: c1"]);

  // plugin owned composite structures cannot be dissolved by ungroup
  const document = editor.session.document;
  document.attachShape(new FakePluginComposite("n1"), null);
  assert.deepEqual(editor.run("ungroup n1"), [
    "error: cannot ungroup composite shape: n1",
  ]);
});

test("file and history errors use the exact contract messages", () => {
  const editor = new EditorHarness();
  assert.deepEqual(editor.run("read a.svg"), [
    "error: cannot read file: a.svg",
  ]);

  editor.runLines("init", "create rect r1 0 0 10 10");
  editor.fileSystem.failAllWrites();
  assert.deepEqual(editor.run("save a.svg"), [
    "error: cannot write file: a.svg",
  ]);

  // a successful document level command locks undo/redo until the next edit
  assert.deepEqual(editor.run("canvas 1024 768"), [
    "canvas resized to 1024x768",
  ]);
  assert.deepEqual(editor.run("undo"), [
    "error: undo not allowed after io command",
  ]);
  assert.deepEqual(editor.run("redo"), [
    "error: redo not allowed after io command",
  ]);

  // a successful save locks undo/redo as well
  const savingEditor = new EditorHarness();
  savingEditor.runLines("init", "create rect r1 0 0 10 10", "save out.svg");
  assert.deepEqual(savingEditor.run("undo"), [
    "error: undo not allowed after io command",
  ]);
});
