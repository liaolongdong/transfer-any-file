#!/usr/bin/env node
// Keep only the hunks whose OLD-side start line is listed. Fails loud on any other hunk.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , patchPath, keepSpec, outPath] = process.argv;
const keep = new Set(keepSpec.split(',').map(Number));
const text = readFileSync(patchPath, 'utf8');
const lines = text.split('\n');
const header = [];
const hunks = [];
let cur = null;
for (const line of lines) {
  if (line.startsWith('@@')) {
    const m = /^@@ -(\d+)(?:,\d+)? \+\d+/.exec(line);
    if (!m) throw new Error(`unparsable hunk header: ${line}`);
    cur = { old: Number(m[1]), body: [line] };
    hunks.push(cur);
  } else if (cur) {
    cur.body.push(line);
  } else {
    header.push(line);
  }
}
const kept = hunks.filter(h => keep.has(h.old));
const dropped = hunks.filter(h => !keep.has(h.old));
const seen = new Set(kept.map(h => h.old));
for (const n of keep) if (!seen.has(n)) throw new Error(`hunk @@ -${n} not present in ${patchPath}`);
if (seen.size !== keep.size) throw new Error('duplicate hunk old-start');
const out = [...header, ...kept.flatMap(h => h.body)].join('\n');
writeFileSync(outPath, out.endsWith('\n') ? out : out + '\n');
console.log(
  `${patchPath}: kept ${kept.map(h => h.old).join(',')} dropped ${dropped.map(h => h.old).join(',') || '-'}`,
);
