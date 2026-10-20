import { test } from "node:test";
import assert from "node:assert/strict";

import { EditorHarness } from "../support/EditorHarness";

test("unsupported elements are skipped without failing the read", () => {
  const editor = new EditorHarness();
  editor.fileSystem.putFile(
    "mixed.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <title>a title</title>
      <desc>a description</desc>
      <defs><rect id="hidden" x="0" y="0" width="5" height="5"/></defs>
      <path d="M0 0 L10 10"/>
      <rect id="r1" x="0" y="0" width="100" height="100"/>
    </svg>`,
  );
  assert.deepEqual(editor.run("read mixed.svg"), ["read mixed.svg (1 elements)"]);
  assert.equal(editor.session.document.findShape("hidden"), null);
});

test("canvas size falls back to viewBox and then to the defaults", () => {
  const editor = new EditorHarness();
  editor.fileSystem.putFile(
    "viewbox.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <rect id="r1" x="0" y="0" width="10" height="10"/>
    </svg>`,
  );
  editor.run("read viewbox.svg");
  assert.equal(editor.session.document.width, 400);
  assert.equal(editor.session.document.height, 300);

  editor.fileSystem.putFile(
    "nodim.svg",
    `<svg xmlns="http://www.w3.org/2000/svg">
      <rect id="r1" x="0" y="0" width="10" height="10"/>
    </svg>`,
  );
  const other = new EditorHarness();
  other.fileSystem.putFile("nodim.svg", editor.fileSystem.getFile("nodim.svg") ?? "");
  other.run("read nodim.svg");
  assert.equal(other.session.document.width, 800);
  assert.equal(other.session.document.height, 600);
});

test("single quotes, comments and CDATA are parsed", () => {
  const editor = new EditorHarness();
  editor.fileSystem.putFile(
    "quirks.svg",
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'>
      <!-- a comment with <tags> inside -->
      <rect id='r1' x='0' y='0' width='200' height='100'/>
      <text id='t1' x='5' y='20'><![CDATA[a < b]]></text>
    </svg>`,
  );
  assert.deepEqual(editor.run("read quirks.svg"), ["read quirks.svg (2 elements)"]);
  assert.equal(editor.session.document.requireShape("t1")?.contentText(), "a < b");
});

test("predefined entities in text and attributes are decoded", () => {
  const editor = new EditorHarness();
  editor.fileSystem.putFile(
    "entities.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <text id="t1" x="5" y="20">a &amp; b &lt; c</text>
      <rect id="r1" x="0" y="0" width="10" height="10" fill="#a&amp;b"/>
    </svg>`,
  );
  editor.run("read entities.svg");
  assert.equal(
    editor.session.document.requireShape("t1")?.contentText(),
    "a & b < c",
  );
  assert.equal(editor.session.document.requireShape("r1")?.fill, "#a&b");
});

test("nested groups are imported with their depth preserved", () => {
  const editor = new EditorHarness();
  editor.fileSystem.putFile(
    "nested.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <g id="a">
        <g id="b">
          <g id="c">
            <rect id="r1" x="1" y="2" width="3" height="4"/>
          </g>
        </g>
      </g>
    </svg>`,
  );
  editor.run("read nested.svg");
  const document = editor.session.document;
  assert.equal(document.requireShape("a")?.parent?.id, "svg");
  assert.equal(document.requireShape("b")?.parent?.id, "a");
  assert.equal(document.requireShape("c")?.parent?.id, "b");
  assert.equal(document.requireShape("r1")?.parent?.id, "c");
  assert.deepEqual(editor.run("tree"), [
    "svg (100x100)",
    "└── g#a",
    "    └── g#b",
    "        └── g#c",
    "            └── rect#r1  x=1 y=2 w=3 h=4",
  ]);
});

test("imported presentation attributes become editable attributes", () => {
  const editor = new EditorHarness();
  editor.fileSystem.putFile(
    "styled.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect id="r1" x="0" y="0" width="10" height="10" fill="#000" stroke="#fff" stroke-width="3"/>
    </svg>`,
  );
  editor.run("read styled.svg");
  assert.deepEqual(editor.run("show r1"), [
    "rect#r1  parent=svg",
    "  x=0 y=0 w=10 h=10",
    "  fill=#000 stroke=#fff stroke-width=3",
  ]);
  editor.run("set r1 stroke-width 5");
  assert.equal(editor.session.document.requireShape("r1")?.strokeWidth, 5);
});

test("unknown attributes such as transform and style are ignored on import", () => {
  const editor = new EditorHarness();
  editor.fileSystem.putFile(
    "transform.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect id="r1" x="0" y="0" width="10" height="10" transform="translate(5,5)" style="opacity:0.5"/>
    </svg>`,
  );
  assert.deepEqual(editor.run("read transform.svg"), ["read transform.svg (1 elements)"]);
  assert.equal(editor.run("tree")[1], "└── rect#r1  x=0 y=0 w=10 h=10");
});
