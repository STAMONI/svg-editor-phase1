import { test } from "node:test";
import assert from "node:assert/strict";

import { EditorHarness } from "../support/EditorHarness";

/** The documented example tree of section 5.1 of the assignment. */
const EXAMPLE_TREE = [
  "svg (800x600)",
  "├── rect#bg" + " ".repeat(8) + "x=0 y=0 w=800 h=600 fill=#ffffff",
  "├── text#title" + " ".repeat(5) + '(20,40) "My Diagram"',
  "└── g#markers",
  "    ├── circle#c1" + " ".repeat(2) + "cx=100 cy=100 r=20 fill=red",
  "    └── rect#box" + " ".repeat(3) + "x=200 y=80 w=60 h=60 fill=#3366ff",
];

function buildExample(editor: EditorHarness): void {
  editor.runLines(
    "init 800 600",
    "create rect bg 0 0 800 600 #ffffff",
    'create text title 20 40 "My Diagram"',
    "create circle c1 100 100 20 red",
    "create rect box 200 80 60 60 #3366ff",
    "group markers c1 box",
  );
}

test("tree renders the documented example", () => {
  const editor = new EditorHarness();
  buildExample(editor);
  assert.deepEqual(editor.run("tree"), EXAMPLE_TREE);
});

test("tree <id> renders only the subtree", () => {
  const editor = new EditorHarness();
  buildExample(editor);
  assert.deepEqual(editor.run("tree markers"), [
    "g#markers",
    "├── circle#c1" + " ".repeat(2) + "cx=100 cy=100 r=20 fill=red",
    "└── rect#box" + " ".repeat(3) + "x=200 y=80 w=60 h=60 fill=#3366ff",
  ]);
  assert.deepEqual(editor.run("tree c1"), [
    "circle#c1 cx=100 cy=100 r=20 fill=red",
  ]);
});

test("show prints the documented attribute details", () => {
  const editor = new EditorHarness();
  buildExample(editor);
  assert.deepEqual(editor.run("show c1"), [
    "circle#c1  parent=g#markers",
    "  cx=100 cy=100 r=20",
    "  fill=red",
  ]);
  assert.deepEqual(editor.run("show bg"), [
    "rect#bg  parent=svg",
    "  x=0 y=0 w=800 h=600",
    "  fill=#ffffff",
  ]);
});

test("query commands report missing ids and missing documents", () => {
  const editor = new EditorHarness();
  assert.deepEqual(editor.run("tree"), [
    "error: no document. use 'init' or 'read' first",
  ]);
  assert.deepEqual(editor.run("show r1"), [
    "error: no document. use 'init' or 'read' first",
  ]);
  editor.run("init");
  assert.deepEqual(editor.run("tree nope"), ["error: no such shape: nope"]);
  assert.deepEqual(editor.run("show nope"), ["error: no such shape: nope"]);
});

test("query commands do not enter the undo stack", () => {
  const editor = new EditorHarness();
  buildExample(editor);
  editor.run("tree");
  editor.run("show c1");
  assert.deepEqual(editor.run("undo"), ["g#markers dissolved"]);
});

test("help lists every command with its syntax", () => {
  const editor = new EditorHarness();
  const lines = editor.run("help");
  assert.equal(lines[0], "commands:");
  const required = [
    "init [w] [h]",
    "read <file.svg>",
    "save [file.svg]",
    "canvas [w] [h]",
    "create <type> <id> [params…] [in <containerId>]",
    "delete <id>",
    "move <id> <dx> <dy>",
    "scale <id> <factor>",
    "set <id> <attr> <value>",
    "group <newGid> <id1> <id2>…",
    "ungroup <gid>",
    "addto <gid> <id>",
    "front <id>",
    "back <id>",
    "tree [id]",
    "show <id>",
    "help",
    "undo",
    "redo",
  ];
  for (const syntax of required) {
    assert.ok(
      lines.some((line) => line.includes(syntax)),
      `help should mention ${syntax}`,
    );
  }
});

test("errors keep the error: prefix and a single line each", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    "create g g1",
    "create rect r1 0 0 10 10 in g1",
  );
  const lines = editor.runLines(
    "create rect r1 0 0 10 10",
    "delete nope",
    "group g2 r1 g1",
    "ungroup r1",
    "create box b1 0 0 10 10",
  );
  for (const line of lines) {
    assert.match(line, /^error: [^\n]+$/);
  }
});

test("text values are quoted and escaped in tree and show output", () => {
  const editor = new EditorHarness();
  editor.runLines("init", 'create text t1 10 20 "say \\"hi\\""');
  assert.deepEqual(editor.run("tree"), [
    "svg (800x600)",
    '└── text#t1  (10,20) "say \\"hi\\""',
  ]);
  assert.deepEqual(editor.run("show t1"), [
    "text#t1  parent=svg",
    "  x=10 y=20",
    '  text="say \\"hi\\""',
  ]);
});

test("multi line text imported from SVG stays on one output line", () => {
  const editor = new EditorHarness();
  editor.fileSystem.putFile(
    "multiline.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <text id="t1" x="1" y="2">first
second</text>
    </svg>`,
  );
  editor.run("read multiline.svg");
  const tree = editor.run("tree");
  assert.equal(tree.length, 2);
  assert.ok(tree[1].includes('"first\\nsecond"'));
});

