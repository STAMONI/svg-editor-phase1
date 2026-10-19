#!/usr/bin/env node
/**
 * Static layering check for the module dependency rules of doc/README.md.
 *
 * Rules:
 *   errors  : no internal imports
 *   model   : may import errors only
 *   io      : may import model + errors
 *   history : may import model
 *   commands: may import model, io, history, errors
 *   cli     : composition root, may import commands and lower layers
 *             (it must not be imported by anything)
 *
 * Usage: node scripts/check-layering.mjs
 * Exit code 1 when a rule is violated.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, normalize, posix } from "node:path";

const ROOT = "src";

const ALLOWED = {
  errors: [],
  model: ["errors"],
  io: ["model", "errors"],
  history: ["model", "errors"],
  commands: ["model", "io", "history", "errors"],
  cli: ["commands", "io", "model", "history", "errors"],
  entry: ["cli"],
};

function listTypeScriptFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(path));
    } else if (entry.name.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

function importsOf(file) {
  const source = readFileSync(file, "utf8");
  const specifiers = [];
  const patterns = [
    /from\s+["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
    /require\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

function resolveLayer(file, specifier) {
  if (!specifier.startsWith(".")) {
    return null; // node: builtins and external packages
  }
  const fromDirectory = posix.dirname(file.split("\\").join("/"));
  const resolved = normalize(posix.join(fromDirectory, specifier)).split("\\").join("/");
  const parts = resolved.split("/");
  return parts[0] === ROOT ? parts[1] : null;
}

const violations = [];
const files = listTypeScriptFiles(ROOT);
for (const file of files) {
  const segments = file.split("\\").join("/").split("/");
  // Files directly in src/ (the entry point) form their own top layer.
  const layer = segments.length === 2 ? "entry" : segments[1];
  const allowed = ALLOWED[layer];
  if (allowed === undefined) {
    violations.push(`${file}: unknown layer ${layer}`);
    continue;
  }
  for (const specifier of importsOf(file)) {
    const target = resolveLayer(file, specifier);
    if (target === null || target === layer) {
      continue;
    }
    if (!allowed.includes(target)) {
      violations.push(`${file}: ${layer} must not import ${target} (${specifier})`);
    }
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`layering violation: ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log(`layering check passed (${files.length} files)`);
}
