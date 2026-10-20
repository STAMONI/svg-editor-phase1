# SVG Editor (Lab1 Phase 1, CLI)

TypeScript / OOP / Command-pattern implementation of the phase 1 SVG editor CLI.

- 完整架构方案、过程记录、一致性自查、质量保证手段：**[doc/README.md](doc/README.md)**
- 需求依据：Lab1 Phase 1：SVG 编辑器（CLI）附件

## Quick start

```bash
npm install
npm run cli            # interactive REPL, prompt "svg> "
npm run verify         # build + layering check + all automated tests (83 tests)
```

Requires Node.js >= 22.8 (uses the built-in `node:test` runner).

## Try it

```text
svg> init 800 600
canvas 800x600 created
svg> create g flowchart
g#flowchart created
svg> create rect start 120 100 160 60 #4a90d9 in flowchart
rect#start created in g#flowchart
svg> tree
svg (800x600)
└── g#flowchart
    └── rect#start          x=120 y=100 w=160 h=60 fill=#4a90d9
svg> save demo.svg
saved to demo.svg (2 elements)
```

Scripts in `examples/` can be replayed with
`node dist/src/index.js examples/flowchart.txt`; the generated SVG opens directly in a browser
(drag it into Chrome/Edge/Firefox, or use the VS Code "SVG Preview" extension).

## Commands

| group | commands |
|---|---|
| document | `init [w] [h]` · `read <file.svg>` · `save [file.svg]` · `canvas [w] [h]` |
| edit | `create <type> <id> [params…] [in <containerId>]` · `delete <id>` · `move <id> <dx> <dy>` · `scale <id> <factor>` · `set <id> <attr> <value>` · `group <newGid> <id1> <id2>…` · `ungroup <gid>` · `addto <gid> <id>` · `front <id>` · `back <id>` |
| display | `tree [id]` · `show <id>` · `help` |
| history | `undo` · `redo` |

Types: `rect` · `circle` · `ellipse` · `line` · `text` · `g` (`create box` is reserved for the
plugin phase and reports `unknown shape type`). Attributes settable with `set`:
`fill`, `stroke`, `stroke-width` plus the geometry attributes of each type.
All errors start with `error:`; a failed command never changes the document.

## Layout

```
src/errors   CliError
src/model    Shape hierarchy, Container/Group, Canvas, SvgDocument
src/io       XML parser, SVG reader/writer, file system abstraction
src/history  snapshot based undo/redo (Memento)
src/commands Command interface, registry, parser, session, concrete commands
src/cli      REPL and composition root
test/        node:test suites (83 tests across 11 files)
examples/    replayable command scripts + sample SVG files
scripts/     layering check
```
