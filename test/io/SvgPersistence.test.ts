import { test } from "node:test";
import assert from "node:assert/strict";

import { Container } from "../../src/model/Container";
import type { Shape } from "../../src/model/Shape";
import type { SvgDocument } from "../../src/model/SvgDocument";
import { EditorHarness } from "../support/EditorHarness";

/** Flattens the document into a comparable structure (type, id, attributes). */
function snapshotTree(container: Container): string[] {
  const lines: string[] = [];
  const walk = (node: Container, depth: number): void => {
    for (const child of node.children) {
      lines.push(`${"  ".repeat(depth)}${describeShape(child)}`);
      if (child instanceof Container) {
        walk(child, depth + 1);
      }
    }
  };
  walk(container, 0);
  return lines;
}

function describeShape(shape: Shape): string {
  const attributes = shape
    .attributeEntries()
    .map(([name, value]) => `${name}=${value}`)
    .join(" ");
  return `${shape.type}#${shape.id} ${attributes}`;
}

function treeOf(document: SvgDocument): string[] {
  return snapshotTree(document.canvas);
}

const OTHER_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>
  <text id="t1" x="10" y="290">imported</text>
  <circle id="c1" cx="50" cy="50" r="10"/>
  <g id="g1">
    <rect id="r2" x="0" y="0" width="10" height="10"/>
    <circle id="c2" cx="5" cy="5" r="2"/>
  </g>
  <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>
</svg>
`;

test("save writes SVG and reports the element count", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init 800 600",
    "create rect bg 0 0 800 600 #ffffff",
    "create text title 20 40 \"My Diagram\"",
  );
  assert.deepEqual(editor.run("save demo.svg"), [
    "saved to demo.svg (2 elements)",
  ]);
  const content = editor.fileSystem.getFile("demo.svg");
  assert.ok(content !== undefined);
  assert.match(content, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(
    content,
    /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="800" height="600" viewBox="0 0 800 600">/,
  );
  assert.match(
    content,
    /<rect id="bg" x="0" y="0" width="800" height="600" fill="#ffffff"\/>/,
  );
  assert.match(content, /<text id="title" x="20" y="40">My Diagram<\/text>/);
});

test("read parses an external SVG and assigns missing ids with warnings", () => {
  const editor = new EditorHarness();
  editor.fileSystem.putFile("other.svg", OTHER_SVG);
  assert.deepEqual(editor.run("read other.svg"), [
    "warning: assigned id rect1 to unnamed <rect>",
    "read other.svg (7 elements)",
  ]);
  const document = editor.session.document;
  assert.equal(document.width, 400);
  assert.equal(document.height, 300);
  assert.equal(document.elementCount(), 7);
  assert.equal(document.requireShape("rect1")?.tagName, "rect");
  assert.equal(document.requireShape("t1")?.tagName, "text");
  assert.deepEqual(
    (document.requireShape("g1") as Container).children.map((child) => child.id),
    ["r2", "c2"],
  );
});

test("saved documents can be read back with identical structure", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init 800 600",
    "create g flowchart",
    "create g node1 in flowchart",
    'create rect start 120 100 160 60 #4a90d9 in node1',
    'create text start-label 155 135 "开始" in node1',
    "create g node2 in flowchart",
    'create rect process 520 100 160 60 #f5a623 in node2',
    'create text process-label 545 135 "处理数据" in node2',
    "create line arrow1 280 130 520 130 black in flowchart",
    "save flowchart.svg",
  );
  const before = treeOf(editor.session.document);

  editor.runLines("init", "read flowchart.svg");
  const after = treeOf(editor.session.document);
  assert.deepEqual(after, before);
});

test("text content with XML special characters survives a round trip", () => {
  const editor = new EditorHarness();
  editor.runLines(
    "init",
    'create text t1 10 20 "a < b & c"',
    "save t.svg",
    "init",
    "read t.svg",
  );
  const text = editor.session.document.requireShape("t1");
  assert.equal(text?.contentText(), "a < b & c");
});

test("read reports missing files and invalid SVG input", () => {
  const editor = new EditorHarness();
  assert.deepEqual(editor.run("read nope.svg"), [
    "error: cannot read file: nope.svg",
  ]);
  editor.fileSystem.putFile("bad.svg", "<html><body/></html>");
  assert.deepEqual(editor.run("read bad.svg"), ["error: invalid SVG: bad.svg"]);
  editor.fileSystem.putFile("broken.svg", "<svg><rect></svg>");
  assert.deepEqual(editor.run("read broken.svg"), [
    "error: invalid SVG: broken.svg",
  ]);
});

test("save reports unwritable files and missing paths", () => {
  const editor = new EditorHarness();
  editor.runLines("init", "create rect r1 0 0 10 10");
  assert.deepEqual(editor.run("save"), [
    "error: no file to save (use 'save <file.svg>')",
  ]);
  editor.fileSystem.failAllWrites();
  assert.deepEqual(editor.run("save out.svg"), [
    "error: cannot write file: out.svg",
  ]);
});

test("save without arguments reuses the last read/save path", () => {
  const editor = new EditorHarness();
  editor.fileSystem.putFile("a.svg", OTHER_SVG);
  editor.runLines("read a.svg", "create rect extra 0 0 5 5", "save");
  assert.ok(editor.fileSystem.getFile("a.svg")?.includes('id="extra"'));
  assert.equal(editor.session.currentPath, "a.svg");
});

test("reading collapses duplicate ids into fresh ones with a warning", () => {
  const editor = new EditorHarness();
  editor.fileSystem.putFile(
    "dup.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect id="a" x="0" y="0" width="10" height="10"/>
      <circle id="a" cx="5" cy="5" r="2"/>
    </svg>`,
  );
  assert.deepEqual(editor.run("read dup.svg"), [
    "warning: duplicate id a on <circle>, assigned id circle1",
    "read dup.svg (2 elements)",
  ]);
});
