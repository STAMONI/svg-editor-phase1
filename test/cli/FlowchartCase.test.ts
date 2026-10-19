import { test } from "node:test";
import assert from "node:assert/strict";

import { Container } from "../../src/model/Container";
import { Rect } from "../../src/model/Rect";
import { EditorHarness } from "../support/EditorHarness";

/**
 * Section 6.1 of the assignment: two node flowchart built with the `in`
 * clause. This is the acceptance case for Composite semantics.
 *
 * Note: unlike the shortened excerpt in the assignment, the tree also prints
 * explicitly set stroke attributes (the arrow has `stroke=black`), which makes
 * the inline view complete; `show` prints the same attribute groups.
 */
const FLOWCHART_TREE = [
  "svg (800x600)",
  "└── g#flowchart",
  "    ├── g#node1",
  "    │   ├── rect#start" + " ".repeat(10) + "x=120 y=100 w=160 h=60 fill=#4a90d9",
  '    │   └── text#start-label' + " ".repeat(4) + '(155,135) "开始"',
  "    ├── g#node2",
  "    │   ├── rect#process" + " ".repeat(8) + "x=520 y=100 w=160 h=60 fill=#f5a623",
  '    │   └── text#process-label' + " ".repeat(2) + '(545,135) "处理数据"',
  "    └── line#arrow1" + " ".repeat(13) + "(280,130) -> (520,130) stroke=black",
];

function buildFlowchart(editor: EditorHarness): void {
  editor.runLines(
    "init 800 600",
    "create g flowchart",
    "create g node1 in flowchart",
    "create rect start 120 100 160 60 #4a90d9 in node1",
    'create text start-label 155 135 "开始" in node1',
    "create g node2 in flowchart",
    "create rect process 520 100 160 60 #f5a623 in node2",
    'create text process-label 545 135 "处理数据" in node2',
    "create line arrow1 280 130 520 130 black in flowchart",
  );
}

test("two node flowchart builds into the documented tree", () => {
  const editor = new EditorHarness();
  buildFlowchart(editor);
  assert.deepEqual(editor.run("tree"), FLOWCHART_TREE);
  const document = editor.session.document;
  assert.equal(document.elementCount(), 8);
  assert.deepEqual(
    document.canvas.children.map((child) => child.id),
    ["flowchart"],
  );
  assert.deepEqual(
    (document.requireShape("node1") as Container).children.map(
      (child) => child.id,
    ),
    ["start", "start-label"],
  );
});

test("moving a node container moves its children and can be undone", () => {
  const editor = new EditorHarness();
  buildFlowchart(editor);
  assert.deepEqual(editor.run("move node2 0 100"), [
    "g#node2 moved by (0,100)",
  ]);
  assert.deepEqual(
    editor.run("tree node2"),
    [
      "g#node2",
      "├── rect#process" + " ".repeat(8) + "x=520 y=200 w=160 h=60 fill=#f5a623",
      '└── text#process-label' + " ".repeat(2) + '(545,235) "处理数据"',
    ],
  );
  assert.deepEqual(editor.run("undo"), ["g#node2 moved back by (0,-100)"]);
  assert.equal((editor.session.document.requireShape("process") as Rect).y, 100);
});

test("scaling a container scales every descendant", () => {
  const editor = new EditorHarness();
  buildFlowchart(editor);
  editor.run("scale node1 2");
  const document = editor.session.document;
  const start = document.requireShape("start") as Rect;
  assert.equal(start.x, 240);
  assert.equal(start.width, 320);
  assert.equal(start.height, 120);
  // the tree structure itself is unchanged
  assert.equal(document.elementCount(), 8);
});

test("the flowchart can be saved and read back", () => {
  const editor = new EditorHarness();
  buildFlowchart(editor);
  assert.deepEqual(editor.run("save flowchart.svg"), [
    "saved to flowchart.svg (8 elements)",
  ]);
  const content = editor.fileSystem.getFile("flowchart.svg") ?? "";
  assert.match(content, /<g id="flowchart">/);
  assert.match(content, /<g id="node1">/);
  assert.match(content, /<line id="arrow1"/);

  assert.deepEqual(editor.runLines("init", "read flowchart.svg"), [
    "canvas 800x600 created",
    "read flowchart.svg (8 elements)",
  ]);
  assert.deepEqual(editor.run("tree"), FLOWCHART_TREE);
});
