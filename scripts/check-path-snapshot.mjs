#!/usr/bin/env node
/**
 * Conversion-path snapshot.
 *
 * `ConverterRegistry.findConversionPath` is a plain BFS over an adjacency list built in
 * `initConverters()` registration order, and it returns the FIRST shortest path. Two equal-length
 * routes therefore resolve by which `register()` call happened earlier — so source file order is
 * an undeclared input to which artifact a user gets. `Converter.edgePreference` (F-5b) makes that
 * declared; this script is what proves the declaration changed nothing.
 *
 * It parses the converter modules' literals rather than importing them: the real registry only
 * exists inside the built page, and the e2e harness serves that page over HTTP with a mocked
 * chrome.storage (it never loads the extension), so reaching a module singleton would mean adding
 * a debug global to production source for the test's benefit.
 *
 * Edge ORDER is read out of `utils/converters/index.ts`, never from the file system: alphabetical
 * file order is not registration order, and an adjacency list built in the wrong order would mirror
 * a registry that does not exist. That is also what makes a `register()` swap visible here.
 *
 * The parser is deliberately strict: a converter shape it cannot read is a hard failure, never a
 * skipped edge. A baseline built from a silently short edge list would lock in the wrong routes and
 * still print OK, which is worse than having no guard at all.
 *
 * Run with --update to rewrite the baseline after an INTENTIONAL semantics change.
 * Run with --verbose to print the per-file parse and the resulting adjacency (diagnostic only, not
 * part of the baseline).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'scripts', '__baseline__', 'conversion-paths.json');
const CONVERTER_DIR = path.join(ROOT, 'utils', 'converters');
const ENTRY_FILE = path.join(CONVERTER_DIR, 'index.ts');
const TYPES_FILE = path.join(ROOT, 'utils', 'core', 'types.ts');

const UPDATE = process.argv.includes('--update');
const VERBOSE = process.argv.includes('--verbose');

/**
 * Guard rail for the parser, not for the graph. `48` is what `getRegisteredFormats()` returns at
 * runtime (the workbench footer prints it) and what `docs/llms.txt` publishes; a converter written
 * in a shape this script cannot read shows up here as a *shorter* list instead of a silent gap.
 * Adding or removing an edge on purpose moves this constant and every document quoting the number
 * together.
 */
const EXPECTED_EDGE_COUNT = 48;

/** Anything the parser could not read, or that did not line up. Non-empty aborts the run. */
const problems = [];

/** Record a parser gap: a message is enough to abort, so callers can keep going while scanning. */
function cannot(message) {
  problems.push(message);
}

/** Relative path for messages, so they read like the other tooling's output. */
function display(filePath) {
  return path.relative(ROOT, filePath);
}

// ---------------------------------------------------------------------------
// Source-reading primitives
// ---------------------------------------------------------------------------

/**
 * Split a file into top-level statements: a statement starts at a column-0 code line and runs to
 * the next one. Prettier enforces two-space indentation inside every block, so column 0 is a
 * reliable boundary without a real parser; a construct we cannot classify still ends up reported,
 * attributed to the statement that holds it. Blank and comment lines trailing a statement are
 * dropped — they document the statement that follows.
 */
function topLevelStatements(src) {
  const lines = src.split('\n');
  const starts = [];
  lines.forEach((line, index) => {
    if (line.trim() === '') return;
    if (/^[ \t)\]};]/.test(line)) return;
    if (/^(?:\/\/|\/\*|\*)/.test(line)) return;
    starts.push(index);
  });
  return starts.map((start, i) => {
    let end = starts[i + 1] ?? lines.length;
    while (end > start + 1 && /(?:^\s*$)|(?:^(?:\/\/|\/\*|\*))/.test(lines[end - 1])) end--;
    return { line: start + 1, text: lines.slice(start, end).join('\n').trimEnd() };
  });
}

/** Split on top-level separators only, so nested `f(a, b)` and `MIME_TYPES[x]` stay one element. */
function splitTopLevel(text, separator = ',') {
  const parts = [];
  let current = '';
  let depth = 0;
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === separator && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map(part => part.trim()).filter(Boolean);
}

/** `FileFormat.PNG` -> `png`, mirroring the string-valued enum in `utils/core/types.ts`. */
function enumValue(text) {
  const m = /^FileFormat\.([A-Z0-9]+)$/.exec(text.trim());
  return m ? m[1].toLowerCase() : null;
}

/**
 * The `from` / `to` property pair of a converter object literal, read as two "sides".
 *
 * Both properties are always the first two of the literal, and each is either a `FileFormat.X`
 * literal or a bare identifier — shorthand (`from,`) or an explicit parameter (`from: to`). Taking
 * the pair as a unit is what keeps a factory's `to,` from being matched against some unrelated
 * `to:` further down the file, which a proximity-window scan does.
 */
function readFromToPair(text, label) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const from = /^\s+from(?:\s*:\s*(FileFormat\.[A-Z0-9]+|\w+))?\s*,?\s*$/.exec(lines[i]);
    if (!from) continue;
    const to = /^\s+to(?:\s*:\s*(FileFormat\.[A-Z0-9]+|\w+))?\s*,?\s*$/.exec(lines[i + 1]);
    if (!to) {
      cannot(`${label}: found a \`from\` property but the next line is not \`to\``);
      return null;
    }
    return { from: sideOf(from[1], 'from'), to: sideOf(to[1], 'to') };
  }
  return null;
}

/** A side with no value is ES shorthand for a property named after itself. */
function sideOf(raw, name) {
  const value = raw ?? name;
  const literal = enumValue(value);
  return literal ? { kind: 'literal', value: literal } : { kind: 'param', value };
}

/** `edgePreference` is absent until F-5b adds it; a missing value is the sort key `0`. */
function readPreference(text) {
  const m = /\bedgePreference:\s*(-?\d+)/.exec(text);
  return m ? Number(m[1]) : 0;
}

// ---------------------------------------------------------------------------
// Module parsing
// ---------------------------------------------------------------------------

/**
 * Read one converter module into exported binding names, each holding the edges that binding
 * registers, in the order the module itself would hand them to `register()`.
 *
 * Four shapes exist today, and each is resolved through the same `from`/`to` pair reader:
 *
 * 1. a plain object literal (`const x: Converter = { from: FileFormat.MD, to: FileFormat.HTML }`);
 * 2. a factory whose literal fixes one side and whose callers pass the other
 *    (`createImageToHtmlConverter(FileFormat.JPG)` -> `jpg->html`,
 *    `createPdfToImageConverter(FileFormat.PNG)` -> `pdf->png` — either side can be the parameter);
 * 3. an array of factory calls or a list of already-parsed bindings;
 * 4. an array built by `push()` inside nested loops over `FileFormat` arrays (`image-convert.ts`,
 *    whose 12 edges are that cross product minus the identity pairs) — the loop variables are
 *    arguments, so the loops have to be expanded to reproduce what `register()` actually sees.
 *
 * Anything else is reported through `problems` rather than skipped.
 */
function parseModule(fileName) {
  const src = fs.readFileSync(path.join(CONVERTER_DIR, fileName), 'utf8');
  const source = `utils/converters/${fileName}`;
  const lines = src.split('\n');
  const statements = topLevelStatements(src);

  /** `const formats = [FileFormat.X, ...]` — every element must be a literal, or it is not one. */
  const formatArrays = new Map();
  /** Loop variable -> the formats it walks, so a factory call can be passed one. */
  const loopValues = new Map();
  for (const statement of statements) {
    const decl = /^(?:export\s+)?const\s+(\w+)\s*(?::[^=]*?)?=\s*\[([\s\S]*?)\]\s*;?\s*$/.exec(statement.text);
    if (!decl || !decl[2].includes('FileFormat.')) continue;
    const elements = splitTopLevel(decl[2]);
    const values = elements.map(enumValue);
    if (values.some(value => value === null)) continue;
    formatArrays.set(decl[1], values);
  }
  for (const statement of statements) {
    for (const loop of statement.text.matchAll(/\bfor\s*\(\s*const\s+(\w+)\s+of\s+(\w+)\s*\)/g)) {
      if (formatArrays.has(loop[2])) loopValues.set(loop[1], formatArrays.get(loop[2]));
    }
  }

  /** Factory name -> its parameter names and which side each of `from` / `to` is decided by. */
  const factories = new Map();
  for (const statement of statements) {
    const decl = /^(?:export\s+)?function\s+(\w*Converter)\s*\(([^)]*)\)\s*:\s*Converter\b/.exec(statement.text);
    if (!decl) continue;
    const pair = readFromToPair(statement.text, `${source}:${statement.line}`);
    if (!pair) {
      cannot(`${source}:${statement.line}: factory ${decl[1]} has no readable from/to pair`);
      continue;
    }
    factories.set(decl[1], {
      params: splitTopLevel(decl[2]).map(param => param.split(':')[0].trim()),
      pair,
      preference: readPreference(statement.text),
    });
  }

  /**
   * Resolve one factory call into the edges it registers, expanding loop variables into the whole
   * list they walk. `guarded` names the two variables an `if (a !== b)` compares, which is the
   * source's own rule for not registering a self edge — it only applies when those two variables
   * really are the arguments, or an unrelated `!==` nearby would silently drop pairs.
   */
  function resolveCall(call, guarded) {
    const factory = factories.get(call.factory);
    if (!factory) {
      cannot(`${source}:${call.line}: call to unknown factory ${call.factory}()`);
      return [];
    }
    const sides = [factory.pair.from, factory.pair.to].map(side => {
      if (side.kind === 'literal') return { values: [side.value], variable: null };
      const index = factory.params.indexOf(side.value);
      if (index < 0) {
        cannot(`${source}:${call.line}: ${call.factory}() reads side '${side.value}' but has no such parameter`);
        return { values: [], variable: null };
      }
      const arg = (call.args[index] ?? '').trim();
      const literal = enumValue(arg);
      if (literal) return { values: [literal], variable: null };
      if (loopValues.has(arg)) return { values: loopValues.get(arg), variable: arg };
      cannot(`${source}:${call.line}: unsupported argument '${arg}' for ${call.factory}()'s ${side.value}`);
      return { values: [], variable: null };
    });
    const [from, to] = sides;
    if (from.values.length === 0 || to.values.length === 0) return [];
    const selfGuard = Boolean(
      from.variable && to.variable && guarded && guarded.has(from.variable) && guarded.has(to.variable),
    );
    const edges = [];
    // Outer list slowest, matching the source's own loop nesting for `image-convert.ts`.
    for (const fromFormat of from.values) {
      for (const toFormat of to.values) {
        if (selfGuard && fromFormat === toFormat) continue;
        edges.push({ from: fromFormat, to: toFormat, preference: factory.preference, source });
      }
    }
    return edges;
  }

  /** `NAME.push(call(...))` occurrences with the `if (a !== b)` on the line above, if any. */
  function pushesOf(name) {
    const pushes = [];
    const pattern = new RegExp(`^\\s*${name}\\.push\\((.*)\\)\\s*;$`);
    lines.forEach((line, index) => {
      const match = pattern.exec(line);
      if (!match) return;
      const call = /\b(\w*Converter)\s*\(([^)]*)\)/.exec(match[1]);
      if (!call || !factories.has(call[1])) {
        cannot(`${source}:${index + 1}: ${name}.push() does not hold a known factory call`);
        return;
      }
      const guard = /if\s*\(\s*(\w+)\s*!==\s*(\w+)\s*\)/.exec(lines[index - 1] ?? '');
      pushes.push({
        factory: call[1],
        args: splitTopLevel(call[2]),
        line: index + 1,
        guarded: guard ? new Set([guard[1], guard[2]]) : null,
      });
    });
    return pushes;
  }

  /** Binding name -> edges, in source order; `exports` maps what index.ts can import to a binding. */
  const bindings = new Map();
  const exported = new Map();
  for (const statement of statements) {
    const decl = /^(?:export\s+)?const\s+(\w+)\s*:\s*(Converter\[\]|Converter)\s*=\s*([\s\S]*?)\s*;\s*$/m.exec(
      statement.text,
    );
    if (!decl) {
      const reexport = /^export\s*\{([^}]+)\}\s*;/.exec(statement.text);
      if (reexport) {
        for (const name of splitTopLevel(reexport[1])) {
          if (!bindings.has(name)) cannot(`${source}:${statement.line}: export { ${name} } is not a known binding`);
          else exported.set(name, bindings.get(name));
        }
      } else {
        const def = /^export\s+default\s+(\w+)\s*;/.exec(statement.text);
        if (def) {
          if (!bindings.has(def[1]))
            cannot(`${source}:${statement.line}: export default ${def[1]} is not a known binding`);
          else exported.set('default', bindings.get(def[1]));
        } else if (/^export\s+default\s*[{(]/.test(statement.text)) {
          const inline = parseConverterExpression(statement.text.replace(/^export\s+default\s*/, ''), statement);
          if (inline) exported.set('default', inline);
        }
      }
      continue;
    }

    const [, name, kind, rawBody] = decl;
    const body = rawBody.trim();
    let edges;
    if (kind === 'Converter[]') {
      if (body === '[]') {
        edges = pushesOf(name).flatMap(call => resolveCall(call, call.guarded));
      } else {
        const arrayBody = /^\[([\s\S]*)\]$/.exec(body)?.[1];
        if (arrayBody === undefined) {
          cannot(`${source}:${statement.line}: ${name}: Converter[] initializer is neither [] nor an array literal`);
          continue;
        }
        edges = splitTopLevel(arrayBody).flatMap(element => {
          const call = /^(\w*Converter)\s*\(([^)]*)\)$/.exec(element);
          if (call && factories.has(call[1]))
            return resolveCall({ factory: call[1], args: splitTopLevel(call[2]), line: statement.line }, null);
          if (bindings.has(element)) return bindings.get(element);
          cannot(`${source}:${statement.line}: array element '${element}' of ${name} is not a factory call or binding`);
          return [];
        });
      }
    } else {
      const inline = parseConverterExpression(body, statement);
      if (!inline) continue;
      edges = inline;
    }

    if (edges.length === 0) {
      cannot(`${source}:${statement.line}: binding ${name} registered no edge`);
      continue;
    }
    bindings.set(name, edges);
    if (statement.text.startsWith('export')) exported.set(name, edges);
  }

  /** A single converter: an object literal with a from/to pair, or one factory call. */
  function parseConverterExpression(body, statement) {
    const call = /^(\w*Converter)\s*\(([^)]*)\)\s*$/.exec(body);
    if (call) {
      const edges = resolveCall({ factory: call[1], args: splitTopLevel(call[2]), line: statement.line }, null);
      if (edges.length !== 1) {
        cannot(`${source}:${statement.line}: ${call[1]}() produced ${edges.length} edges for a single Converter`);
        return null;
      }
      return edges;
    }
    const pair = readFromToPair(body, `${source}:${statement.line}`);
    if (!pair) {
      cannot(`${source}:${statement.line}: no from/to pair and no factory call in ${body.split('\n')[0]}`);
      return null;
    }
    if (pair.from.kind !== 'literal' || pair.to.kind !== 'literal') {
      cannot(`${source}:${statement.line}: a plain Converter whose side is not a literal is not readable`);
      return null;
    }
    return [{ from: pair.from.value, to: pair.to.value, preference: readPreference(body), source }];
  }

  const edges = [...new Set([...bindings.values()].flat())];
  if (exported.size === 0) cannot(`${source}: exports no converter binding — index.ts cannot import it`);
  return { source, bindings, exported, edges };
}

// ---------------------------------------------------------------------------
// Registration sequence
// ---------------------------------------------------------------------------

/**
 * The order `initConverters()` hands converters to `register()`, read out of the entry module.
 *
 * A `register(converter)` inside `for (const converter OF ARRAY)` stands for the whole array in the
 * array's own order — which is why the loop variable is resolved backwards to what it iterates
 * instead of looked up in a flat map (every loop here reuses the name `converter`).
 */
function readRegistrationSequence(modules) {
  const src = fs.readFileSync(ENTRY_FILE, 'utf8');
  const lines = src.split('\n');

  /** Local import name -> the exported binding it stands for, per module. */
  const imports = new Map();
  for (const line of lines) {
    const decl = /^import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"]~\/utils\/converters\/([\w-]+)['"]/.exec(
      line.trim(),
    );
    if (!decl) continue;
    const module = modules.find(m => m.source === `utils/converters/${decl[3]}.ts`);
    if (!module) {
      cannot(`utils/converters/index.ts: imports ${decl[3]}, which is not a converter module on disk`);
      continue;
    }
    if (decl[1]) imports.set(decl[1], { module, exportedName: 'default' });
    for (const name of splitTopLevel(decl[2] ?? '')) {
      const local = name
        .split(/\s+as\s+/)
        .pop()
        .trim();
      imports.set(local, { module, exportedName: name.split(/\s+as\s+/)[0].trim() });
    }
  }

  const sequence = [];
  const loopBindings = new Map();
  for (const line of lines) {
    // A commented-out `register()` is not a registration, and counting one would hide a removed
    // edge — the import scan above deliberately reads only real `import` statements for the same
    // reason.
    if (/^\s*\/\//.test(line)) continue;
    if (/^}/.test(line)) loopBindings.clear();
    const loop = /^\s*for\s*\(\s*const\s+(\w+)\s+of\s+(\w+)\s*\)/.exec(line);
    if (loop) loopBindings.set(loop[1], loop[2]);
    const register = /converterRegistry\.register\(\s*(\w+)\s*\)/.exec(line);
    if (!register) continue;

    const referenced = loopBindings.get(register[1]) ?? register[1];
    const imported = imports.get(referenced);
    if (!imported) {
      cannot(`utils/converters/index.ts: register(${register[1]}) is not an imported converter`);
      continue;
    }
    const edges = imported.module.exported.get(imported.exportedName);
    if (!edges) {
      cannot(
        `utils/converters/index.ts: register(${register[1]}) -> ${imported.module.source} exports no binding '${imported.exportedName}'`,
      );
      continue;
    }
    sequence.push(...edges);
  }
  return sequence;
}

/**
 * Mirror of `register()` (registry.ts:13-24) plus `getRegisteredFormats()`: adjacency per `from`,
 * first registration wins a slot, duplicates collapsed. A repeated `from->to` is reported because
 * the snapshot records edge labels only — two converters claiming one edge is a difference the
 * baseline literally cannot see.
 */
function buildAdjacency(edges) {
  const adj = new Map();
  const seen = new Set();
  const duplicates = [];
  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}`;
    if (seen.has(key)) {
      duplicates.push(key);
      continue;
    }
    seen.add(key);
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    adj.get(edge.from).push({ to: edge.to, preference: edge.preference });
  }
  // Stable sort: equal preferences keep registration order, which is all today's all-zero graph
  // means. F-5b turns this line into the declared rule.
  for (const list of adj.values()) list.sort((a, b) => a.preference - b.preference);
  return adj;
}

// ---------------------------------------------------------------------------
// BFS
// ---------------------------------------------------------------------------

/**
 * The same algorithm as `utils/core/registry.ts:69-98`, statement for statement.
 *
 * Two details are easy to "improve" into a different function, so each is marked with the line it
 * mirrors:
 * - `target === to` is tested *before* the visited check (registry.ts:86-88), so a target reachable
 *   at the same depth through two parents resolves to whichever parent is dequeued first;
 * - `visited` is marked when a node is enqueued (registry.ts:90-93), not when it is dequeued.
 *
 * Measured on today's graph, both are load-bearing for nothing: the same 182 routes come out of a
 * textbook BFS that marks visited at dequeue. What decides the snapshot is the order of each
 * adjacency list, i.e. registration order — flipping `html->pdf` against `html->png` moves 14 pairs.
 * The mirror is kept exact anyway: F-5b inserts edges by preference, and then these two lines are
 * exactly where a tie gets resolved.
 *
 * Steps collapse to `from>to` labels: the registry carries the converter object per step, but an
 * object cannot change which route the BFS takes — only what that route produces.
 */
function findPath(adj, from, to) {
  if (from === to) return []; // registry.ts:70
  const visited = new Set([from]); // registry.ts:72
  const queue = [[from, []]]; // registry.ts:74
  let head = 0; // registry.ts:75
  while (head < queue.length) {
    const [current, trail] = queue[head++]; // registry.ts:78
    for (const { to: target } of adj.get(current) ?? []) {
      // registry.ts:79-81
      const next = [...trail, `${current}>${target}`]; // registry.ts:84
      if (target === to) return next; // registry.ts:86-88
      if (!visited.has(target)) {
        // registry.ts:90
        visited.add(target);
        queue.push([target, next]); // registry.ts:91-92
      }
    }
  }
  return null; // registry.ts:97
}

/** Every ordered source x target pair except the identity ones. */
function snapshot(adj, formats) {
  const out = {};
  for (const from of formats) {
    for (const to of formats) {
      if (from !== to) out[`${from}->${to}`] = findPath(adj, from, to);
    }
  }
  return out;
}

/**
 * Write the baseline one pair per line.
 *
 * `JSON.stringify(_, null, 2)` would explode every step array onto its own line, which Prettier
 * then collapses — so `--update` would leave the committed file failing `prettier --check` and
 * reformatting it would make the file differ from what the script regenerates. Emitting the shape
 * Prettier keeps means the two agree and a rewritten baseline shows a diff of exactly the pairs
 * that moved.
 */
function serializeSnapshot(count, formats, paths) {
  const inline = values => `[${values.map(value => JSON.stringify(value)).join(', ')}]`;
  const keys = Object.keys(paths);
  const pairs = keys.map((key, index) => {
    const value = paths[key] === null ? 'null' : inline(paths[key]);
    return `    ${JSON.stringify(key)}: ${value}${index === keys.length - 1 ? '' : ','}`;
  });
  return [
    '{',
    `  "edgeCount": ${count},`,
    `  "formats": ${inline(formats)},`,
    '  "paths": {',
    ...pairs,
    '  }',
    '}',
    '',
  ].join('\n');
}

/**
 * The format list read straight from the enum, so a newly added format enters the snapshot matrix
 * instead of quietly staying out of it. Declaration order is the baseline's key order.
 */
function readFormats() {
  const src = fs.readFileSync(TYPES_FILE, 'utf8');
  const body = /enum\s+FileFormat\s*\{([\s\S]*?)\n\}/.exec(src);
  if (!body) {
    cannot(`${display(TYPES_FILE)}: no 'enum FileFormat' block found`);
    return [];
  }
  const formats = [...body[1].matchAll(/^\s*([A-Z0-9]+)\s*=\s*'([^']+)'/gm)].map(m => m[2]);
  if (formats.length === 0) cannot(`${display(TYPES_FILE)}: FileFormat has no members`);
  return formats;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const formats = readFormats();
const modules = fs
  .readdirSync(CONVERTER_DIR, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'index.ts')
  .map(entry => parseModule(entry.name));

const registered = readRegistrationSequence(modules);
const adj = buildAdjacency(registered);
const edgeCount = [...adj.values()].reduce((total, list) => total + list.length, 0);

// Every module must contribute, and every contribution must be reachable from `initConverters()`.
for (const module of modules) {
  const parsed = module.edges.length;
  const hits = registered.filter(edge => edge.source === module.source).length;
  if (parsed === 0) cannot(`${module.source}: no converter recognised — the parser does not read its shape`);
  else if (hits === 0) cannot(`${module.source}: ${parsed} converter(s) parsed but never registered`);
  else if (hits !== parsed) cannot(`${module.source}: ${hits} of ${parsed} parsed converters registered`);
}

const perFile = modules.map(m => `${m.source.replace('utils/converters/', '').replace('.ts', '')}=${m.edges.length}`);

if (VERBOSE) {
  for (const line of perFile) console.log(`  ${line}`);
  for (const [from, list] of adj) console.log(`  adjacency ${from}: ${list.map(x => x.to).join(' ')}`);
  console.log(`  registered ${registered.length} calls -> ${edgeCount} unique edges`);
}

const duplicates = registered
  .map(e => `${e.from}->${e.to}`)
  .filter((key, index, all) => all.indexOf(key) !== index)
  .filter((key, index, all) => all.indexOf(key) === index);
if (duplicates.length > 0) {
  cannot(`duplicate from->to registrations (register() keeps the first slot, last converter): ${duplicates.join(' ')}`);
}

if (problems.length > 0) {
  console.error('path snapshot: the parser could not read every converter:');
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(`per-file edges: ${perFile.join(' ')}`);
  console.error('Fix the parser (or the converter shape) instead of accepting a short edge list.');
  process.exit(1);
}

if (edgeCount !== EXPECTED_EDGE_COUNT) {
  console.error(`edgeCount ${edgeCount} != expected ${EXPECTED_EDGE_COUNT}. per-file edges: ${perFile.join(' ')}`);
  console.error(
    'If the graph really changed, update EXPECTED_EDGE_COUNT together with the documents that ' +
      'quote the number (workbench footer, README, docs/).',
  );
  process.exit(1);
}

const snap = snapshot(adj, formats);
const serialized = serializeSnapshot(edgeCount, formats, snap);

if (UPDATE) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, serialized);
  console.log(`baseline written: ${edgeCount} edges, ${Object.keys(snap).length} pairs`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error(`no baseline at ${display(BASELINE)}. Run with --update after verifying edgeCount.`);
  process.exit(1);
}

const expected = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const diffs = [];
if (expected.edgeCount !== edgeCount) diffs.push(`edgeCount ${expected.edgeCount} -> ${edgeCount}`);
for (const key of Object.keys(expected.paths)) {
  const before = JSON.stringify(expected.paths[key]);
  const after = JSON.stringify(snap[key]);
  if (before !== after) diffs.push(`${key}: ${before} -> ${after}`);
}
for (const key of Object.keys(snap)) {
  if (!(key in expected.paths)) diffs.push(`${key}: new pair missing from the baseline`);
}
if (diffs.length > 0) {
  console.error(`path snapshot drifted (${String(diffs.length)} difference(s)):`);
  for (const diff of diffs.slice(0, 20)) console.error(`  ${diff}`);
  console.error('\nIf the change is intentional, review each diff, then re-run with --update.');
  process.exit(1);
}
console.log(`path snapshot OK: ${String(edgeCount)} edges, ${String(Object.keys(snap).length)} pairs`);
