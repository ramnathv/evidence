#!/usr/bin/env node
// detect-gaps.mjs — audit: enum props whose documented `Options` list is missing values
// that the docs' own code examples use. Read-only; scans the generated reference/*.md.
//
// sync-docs.mjs already AUTO-FIXES the unambiguous cases (a prop defined once per file):
// it appends the example-only values to the Options cell. This tool re-reports them and,
// more usefully, flags the ones sync deliberately left alone:
//   [auto-fixed]  prop defined once → sync appended the missing values; nothing to do.
//   [REVIEW]      prop defined multiple times in the file (e.g. labelPosition on
//                 ReferenceLine vs ReferenceArea) → examples can't be attributed to the
//                 right definition, so sync skips it. Consider a CORRECTIONS.md note.
//
// Heuristic per file:
//   1. From each generated prop table, collect props whose Options cell is a small set
//      of enum-like bareword tokens, skipping free-form cells and type placeholders.
//   2. From every fenced code block, collect `prop=value` literal usages.
//   3. Report values used in examples but absent from the documented enum.

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const refDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reference');

// Cells that describe a value TYPE rather than enumerate literal choices.
const FREEFORM = /column name|array|query name|string|number|boolean|expression|see |http|\{/i;
// Single-token "type placeholder" cells (e.g. Options = "url") — not real enums.
const TYPE_PLACEHOLDER = /^(url|text|col|column|color|colour|date|datetime|json|css|html|path|value|name|id|px|em|rem|percent|hex)$/i;

function enumFromCell(cell) {
	const c = cell.trim();
	if (!c || FREEFORM.test(c)) return null;
	const tokens = c.split(',').map((t) => t.trim());
	// A one-token cell that's a generic type word is a placeholder, not an enum.
	if (tokens.length === 1 && TYPE_PLACEHOLDER.test(tokens[0])) return null;
	// Enum-like: every token is a short bareword (identifier / number / %-suffix).
	if (tokens.every((t) => /^[A-Za-z0-9_%-]+$/.test(t)) && tokens.length >= 1) {
		return new Set(tokens.map((t) => t.toLowerCase()));
	}
	return null;
}

function parseTables(text) {
	const enums = new Map(); // propName -> Set(options) (last definition wins)
	const counts = new Map(); // propName -> number of table rows defining it
	for (const line of text.split('\n')) {
		const m = /^\|\s*`([A-Za-z0-9_]+)`[^|]*\|([^|]*)\|([^|]*)\|/.exec(line);
		if (!m) continue;
		const [, name, , options] = m;
		const set = enumFromCell(options);
		if (!set) continue;
		enums.set(name, set);
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	return { enums, counts };
}

function usagesFromCode(text, propNames) {
	// Collect prop=value literals inside fenced code blocks.
	const used = new Map(); // prop -> Set(values)
	const fences = text.match(/```[\s\S]*?```/g) || [];
	const propAlt = [...propNames].join('|');
	if (!propAlt) return used;
	const re = new RegExp(`\\b(${propAlt})=(?:"([^"{}]+)"|'([^'{}]+)'|([A-Za-z0-9_%.-]+))`, 'g');
	for (const block of fences) {
		let m;
		while ((m = re.exec(block))) {
			const prop = m[1];
			const val = (m[2] || m[3] || m[4] || '').toLowerCase();
			// Keep only clean enum-like literals; reject example data (urls, paths,
			// html, column refs like `link_col`, numbers standing in for real values).
			if (!/^[a-z][a-z0-9]*[0-9]?$/.test(val)) continue;
			if (!used.has(prop)) used.set(prop, new Set());
			used.get(prop).add(val);
		}
	}
	return used;
}

async function walk(dir) {
	const out = [];
	for (const e of await readdir(dir, { withFileTypes: true })) {
		const full = join(dir, e.name);
		if (e.isDirectory()) out.push(...(await walk(full)));
		else if (e.name.endsWith('.md')) out.push(full);
	}
	return out;
}

const files = await walk(refDir);
const gaps = [];
for (const file of files) {
	const text = await readFile(file, 'utf8');
	const { enums, counts } = parseTables(text);
	if (enums.size === 0) continue;
	const used = usagesFromCode(text, new Set(enums.keys()));
	for (const [prop, values] of used) {
		const documented = enums.get(prop);
		const missing = [...values].filter((v) => !documented.has(v));
		if (missing.length) {
			const ambiguous = (counts.get(prop) ?? 0) > 1;
			gaps.push({ file: relative(refDir, file), prop, missing, documented: [...documented], ambiguous });
		}
	}
}

// Run on the generated reference, single-definition gaps are already augmented by sync
// (their Options cell no longer parses as a plain enum), so everything surfaced here is
// an UNRESOLVED gap — typically a prop with multiple definitions in one file.
gaps.sort((a, b) => a.file.localeCompare(b.file) || a.prop.localeCompare(b.prop));
for (const g of gaps) {
	const why = g.ambiguous ? 'multiple definitions in file — examples not attributable' : 'not auto-augmented';
	console.log(`${g.file}  ·  ${g.prop}   (${why})`);
	console.log(`   documented: ${g.documented.join(', ')}`);
	console.log(`   used-but-undocumented: ${g.missing.join(', ')}`);
}
console.log(
	`\n${gaps.length} unresolved enum gap(s) across ${files.length} files.` +
		(gaps.length ? ' Consider a CORRECTIONS.md note for each.' : '')
);
