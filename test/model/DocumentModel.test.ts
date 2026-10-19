import { test } from "node:test";
import assert from "node:assert/strict";

import { Circle } from "../../src/model/Circle";
import { CliError } from "../../src/errors/CliError";
import { Group } from "../../src/model/Group";
import { Line } from "../../src/model/Line";
import { Rect } from "../../src/model/Rect";
import { SvgDocument } from "../../src/model/SvgDocument";
import { TextShape } from "../../src/model/TextShape";

test("document starts empty with the requested canvas size", () => {
  const doc = new SvgDocument(800, 600);
  assert.equal(doc.width, 800);
  assert.equal(doc.height, 600);
  assert.equal(doc.canvas.children.length, 0);
  assert.equal(doc.elementCount(), 0);
});

test("attach, find and detach keep parent links consistent", () => {
  const doc = new SvgDocument(800, 600);
  const group = new Group("g1");
  const rect = new Rect("r1", 10, 20, 100, 50);

  doc.attachShape(group, null);
  doc.attachShape(rect, group);

  assert.equal(doc.canvas.children.length, 1);
  assert.equal(rect.parent, group);
  assert.equal(doc.findShape("r1"), rect);
  assert.equal(doc.findShape("g1"), group);
  assert.equal(doc.findShape("missing"), null);

  doc.detachShape(rect);
  assert.equal(rect.parent, null);
  assert.equal(doc.findShape("r1"), null);
  assert.equal(doc.elementCount(), 1);
});

test("duplicate ids are rejected across the whole document", () => {
  const doc = new SvgDocument(800, 600);
  doc.attachShape(new Rect("dup", 0, 0, 10, 10), null);
  assert.throws(
    () => doc.attachShape(new Circle("dup", 5, 5, 2), null),
    (error: unknown) =>
      error instanceof CliError && error.message === "id already exists: dup",
  );
});

test("ids are case sensitive", () => {
  const doc = new SvgDocument(800, 600);
  doc.attachShape(new Rect("R1", 0, 0, 10, 10), null);
  doc.attachShape(new Rect("r1", 0, 0, 10, 10), null);
  assert.equal(doc.elementCount(), 2);
});

test("leaf move updates its anchor point", () => {
  const rect = new Rect("r1", 10, 20, 100, 50);
  rect.move(30, 0);
  assert.deepEqual(rect.anchor, { x: 40, y: 20 });
  assert.equal(rect.width, 100);
});

test("container move recurses into nested containers", () => {
  const doc = new SvgDocument(800, 600);
  const outer = new Group("outer");
  const inner = new Group("inner");
  const rect = new Rect("r1", 10, 20, 100, 50);
  const text = new TextShape("t1", 15, 30, "hello");
  const line = new Line("l1", 0, 0, 10, 10);
  doc.attachShape(outer, null);
  doc.attachShape(inner, outer);
  doc.attachShape(rect, inner);
  doc.attachShape(text, inner);
  doc.attachShape(line, outer);

  outer.move(5, 7);

  assert.deepEqual(rect.anchor, { x: 15, y: 27 });
  assert.deepEqual(text.anchor, { x: 20, y: 37 });
  assert.deepEqual(line.anchor, { x: 5, y: 7 });
});

test("container scale multiplies every descendant geometry", () => {
  const doc = new SvgDocument(800, 600);
  const group = new Group("g1");
  const inner = new Group("g2");
  const rect = new Rect("r1", 10, 20, 100, 50);
  const circle = new Circle("c1", 100, 100, 20);
  doc.attachShape(group, null);
  doc.attachShape(inner, group);
  doc.attachShape(rect, inner);
  doc.attachShape(circle, group);

  group.scale(2);

  assert.equal(rect.x, 20);
  assert.equal(rect.y, 40);
  assert.equal(rect.width, 200);
  assert.equal(rect.height, 100);
  assert.equal(circle.cx, 200);
  assert.equal(circle.r, 40);
});

test("setAttribute enforces the whitelist of the concrete type", () => {
  const rect = new Rect("r1", 10, 20, 100, 50);
  rect.setAttribute("x", "30");
  assert.equal(rect.x, 30);
  rect.setAttribute("fill", "#eee");
  assert.equal(rect.fill, "#eee");
  rect.setAttribute("stroke-width", "2");
  assert.equal(rect.strokeWidth, 2);

  assert.throws(
    () => rect.setAttribute("cx", "1"),
    (error: unknown) =>
      error instanceof CliError && error.message === "unknown attribute: cx",
  );
  assert.throws(
    () => rect.setAttribute("width", "-1"),
    (error: unknown) =>
      error instanceof CliError && error.message === "width must be positive",
  );
});

test("text content is edited through the text pseudo attribute", () => {
  const text = new TextShape("t1", 20, 40, "My Diagram");
  assert.equal(text.contentText(), "My Diagram");
  text.setAttribute("text", "My Diagram v2");
  assert.equal(text.content, "My Diagram v2");
  assert.equal(text.describeInline(), '(20,40) "My Diagram v2"');
  assert.deepEqual(text.describeDetails(), [
    "x=20 y=40",
    'text="My Diagram v2"',
  ]);
});

test("snapshot is a deep copy", () => {
  const doc = new SvgDocument(400, 300);
  const group = new Group("g1");
  doc.attachShape(group, null);
  doc.attachShape(new Rect("r1", 0, 0, 10, 10), group);

  const copy = doc.snapshot();
  const copiedRect = copy.requireShape("r1");
  copiedRect.move(100, 100);
  copy.setSize(1, 1);

  assert.equal(doc.width, 400);
  assert.equal((doc.requireShape("r1") as Rect).x, 0);
  assert.equal(copiedRect.parent?.id, "g1");
});

test("elementCount counts nested shapes but not the canvas", () => {
  const doc = new SvgDocument(800, 600);
  const a = new Group("a");
  const b = new Group("b");
  doc.attachShape(a, null);
  doc.attachShape(b, a);
  doc.attachShape(new Rect("r1", 0, 0, 1, 1), b);
  doc.attachShape(new Circle("c1", 0, 0, 1), a);
  assert.equal(doc.elementCount(), 4);
});

test("canvas size must stay positive", () => {
  const doc = new SvgDocument(800, 600);
  assert.throws(
    () => doc.setSize(0, 100),
    (error: unknown) =>
      error instanceof CliError && error.message === "canvas size must be positive",
  );
  doc.setSize(1024, 768);
  assert.equal(doc.canvas.describeCanvasSize(), "1024x768");
});
