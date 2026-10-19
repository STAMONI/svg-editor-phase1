/**
 * The six shape types built into the kernel of this phase.
 *
 * `box` (the composite plugin type of the next phase) is intentionally absent:
 * `create box` has to fail with `unknown shape type` in this phase.
 */
export const BUILT_IN_SHAPE_TYPES = [
  "rect",
  "circle",
  "ellipse",
  "line",
  "text",
  "g",
] as const;

export type BuiltInShapeType = (typeof BUILT_IN_SHAPE_TYPES)[number];

/** Every renderable node type, including the document root. */
export type ShapeType = BuiltInShapeType | "svg";
