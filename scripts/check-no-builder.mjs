// ABOUTME: Zero-dependency guard that fails when shipped files reference Builder.io
// ABOUTME: or agent-native, so the de-coupled fork cannot silently regress.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain, reportResult } from "./lib.mjs";

// Two entries cover every branded form: builder\.?io matches builder.io AND builderio
// (dotless), and agent-native catches all variants including @agent-native, plan.agent-native,
// and dotted TLD forms like agent-native.io that lookaround-based patterns missed.
const FORBIDDEN = [
  { label: "builder.io", re: /builder\.?io/i },
  { label: "agent-native", re: /agent-native/i },
];

// Lines a maintainer has deliberately allowed (e.g. one provenance attribution).
const ALLOW = [/<!-- provenance -->/];

export function findForbidden(text) {
  const hits = new Set();
  for (const rawLine of text.split("\n")) {
    if (ALLOW.some((re) => re.test(rawLine))) continue;
    for (const { label, re } of FORBIDDEN) {
      if (re.test(rawLine)) hits.add(label);
    }
  }
  return [...hits];
}

// Paths that ship to users and must stay Builder-free. docs/ (specs & plans) and
// .git are intentionally excluded — they legitimately discuss the migration.
const SCAN = [
  "skills",
  ".claude-plugin",
  ".codex-plugin",
  ".agents",
  ".github",
  "package.json",
  "README.md",
  "CONTRIBUTING.md",
  "CLAUDE.md",
];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function* walk(target) {
  const s = await stat(target);
  if (s.isDirectory()) {
    for (const entry of await readdir(target)) {
      yield* walk(path.join(target, entry));
    }
  } else if (/\.(md|json|mjs|js|yml|yaml|txt)$/.test(target)) {
    yield target;
  }
}

async function main() {
  const failures = [];
  for (const rel of SCAN) {
    const abs = path.join(repoRoot, rel);
    try {
      for await (const file of walk(abs)) {
        const hits = findForbidden(await readFile(file, "utf8"));
        if (hits.length) failures.push(`${path.relative(repoRoot, file)}: ${hits.join(", ")}`);
      }
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }
  reportResult(failures, {
    header: "Builder/agent-native references found:",
    ok: "No Builder/agent-native references found.",
  });
}

// Only run the filesystem scan when executed directly, not when imported by tests.
if (isMain(import.meta.url)) {
  await main();
}
