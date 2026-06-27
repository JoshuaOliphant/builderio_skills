# Strip Builder.io Coupling — Local HTML Visual Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every Builder.io / agent-native dependency from this skills repo and make the two visual skills produce a self-contained local HTML artifact instead of publishing to a hosted Plan app.

**Architecture:** The 8 "thinking" skills keep their behavior and only lose an install line. The 2 visual skills are rewritten so their deliverable is one self-contained `.html` file (all CSS/JS inline, no external network references) written under `plans/<slug>/` and opened locally; the agent free-writes the HTML each run, guided by one lean `references/artifact.md` correctness doc. The agent-native sync/CI plumbing is deleted and replaced by two zero-dependency Node guard scripts. Manifests/docs are de-branded.

**Tech Stack:** Markdown skill files; zero-dependency Node (ESM, `node --test` built-in runner) for the guard/validator scripts; no runtime app, no build step, no third-party packages.

---

## File Structure

New / changed files:

- `scripts/check-no-builder.mjs` — NEW. Greps a defined set of repo paths for forbidden Builder/agent-native strings; exits non-zero on a hit (allowlist for provenance attribution). Replaces the deleted sync/check apparatus.
- `scripts/check-no-builder.test.mjs` — NEW. `node --test` unit tests for the detection function.
- `scripts/validate-artifact.mjs` — NEW. Lints a generated `.html` for external references and required HTML tags; the visual skills' self-containment guard.
- `scripts/validate-artifact.test.mjs` — NEW. `node --test` unit tests for the validator.
- `scripts/sync-agent-native-plan-skills.mjs` — DELETE.
- `.github/workflows/ci.yml` — REPLACE with a Builder-free check.
- `.github/workflows/update-agent-native-plan-skills.yml` — DELETE.
- `package.json` — rename identity, drop sync script, repoint `check`.
- `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json` — de-brand + rename.
- `README.md`, `CONTRIBUTING.md`, `CLAUDE.md` — de-brand.
- `.agents/skills/adding-a-skill/SKILL.md` — rewrite for the local model.
- `.gitignore` — NEW (or modified) to ignore `plans/`.
- `skills/<8 thinking skills>/README.md` — replace the npx install line.
- `skills/visual-plan/SKILL.md`, `skills/visual-recap/SKILL.md` — rewrite for local HTML deliverable.
- `skills/visual-plan/references/artifact.md` — NEW house-rules doc.
- `skills/visual-plan/references/{wireframe,canvas,document-quality,exemplar}.md` — reframe for local HTML, drop agent-native renderer specifics.
- `skills/visual-plan/README.md`, `skills/visual-recap/README.md` — de-brand catalog pages.

Task dependency: Phase A (guard scripts) first so later phases can verify themselves; Phase B (plumbing/de-brand) and Phase C (thinking skills) are independent; Phase D (visual skills) is the core; Phase E (smoke) last.

---

## Phase A — Guard scripts (build the safety net first)

### Task 1: `check-no-builder` detection function (TDD)

**Files:**
- Create: `scripts/check-no-builder.mjs`
- Test: `scripts/check-no-builder.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// ABOUTME: Tests for the forbidden-string detector that keeps Builder/agent-native
// ABOUTME: references out of shipped skill files and manifests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { findForbidden } from "./check-no-builder.mjs";

test("flags agent-native references", () => {
  assert.deepEqual(
    findForbidden("install with npx @agent-native/skills@latest add"),
    ["@agent-native"],
  );
});

test("flags a bare agent-native reference", () => {
  assert.deepEqual(findForbidden("the agent-native framework path"), ["agent-native"]);
});

test("flags builder.io and plan.agent-native and builderio", () => {
  assert.deepEqual(
    findForbidden("see builder.io and plan.agent-native.com and BuilderIO").sort(),
    ["builder.io", "builderio", "plan.agent-native"].sort(),
  );
});

test("allows clean text", () => {
  assert.deepEqual(findForbidden("a self-contained local html plan"), []);
});

test("allows an explicit provenance attribution line", () => {
  const line = "Forked from https://github.com/BuilderIO/skills <!-- provenance -->";
  assert.deepEqual(findForbidden(line), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/check-no-builder.test.mjs`
Expected: FAIL — `Cannot find module './check-no-builder.mjs'` (or `findForbidden is not a function`).

- [ ] **Step 3: Write minimal implementation**

```js
// ABOUTME: Zero-dependency guard that fails when shipped files reference Builder.io
// ABOUTME: or agent-native, so the de-coupled fork cannot silently regress.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FORBIDDEN = [
  { label: "builder.io", re: /builder\.io/i },
  { label: "builderio", re: /builderio/i },
  // lookbehind/ahead so this does not double-match @agent-native / plan.agent-native
  { label: "agent-native", re: /(?<![@.])agent-native(?!\.)/i },
  { label: "@agent-native", re: /@agent-native/i },
  { label: "plan.agent-native", re: /plan\.agent-native/i },
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
  if (failures.length) {
    console.error("Builder/agent-native references found:\n" + failures.map((f) => `  ${f}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log("No Builder/agent-native references found.");
  }
}

// Only run the filesystem scan when executed directly, not when imported by tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/check-no-builder.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/check-no-builder.mjs scripts/check-no-builder.test.mjs
git commit -m "feat: add zero-dep guard against Builder/agent-native references"
```

Note: the repo-wide scan will still report existing hits until later tasks de-brand the files. That is expected; do not run the full scan as a gate until Task 16.

---

### Task 2: `validate-artifact` self-containment linter (TDD)

**Files:**
- Create: `scripts/validate-artifact.mjs`
- Test: `scripts/validate-artifact.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// ABOUTME: Tests for the self-contained-HTML validator used by the visual skills
// ABOUTME: to prove a generated plan/recap has no external dependencies.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateArtifact } from "./validate-artifact.mjs";

const good = `<!doctype html><html><head><style>:root{--x:0}</style></head>
<body><h1>Plan</h1><img src="data:image/png;base64,AAAA"><script>0</script></body></html>`;

test("clean self-contained file has no violations", () => {
  assert.deepEqual(validateArtifact(good), []);
});

test("flags missing required html tags", () => {
  const v = validateArtifact("<div>no doctype or html</div>");
  assert.ok(v.some((m) => /required HTML/i.test(m)));
});

test("flags an external script", () => {
  const v = validateArtifact(good.replace("<script>0</script>", '<script src="https://cdn.example.com/x.js"></script>'));
  assert.ok(v.some((m) => /external reference/i.test(m) && /cdn\.example\.com/.test(m)));
});

test("flags an external font / stylesheet link", () => {
  const v = validateArtifact(good.replace("</head>", '<link rel="stylesheet" href="https://fonts.googleapis.com/x"></head>'));
  assert.ok(v.some((m) => /external reference/i.test(m)));
});

test("flags protocol-relative and css url() externals", () => {
  const v1 = validateArtifact(good.replace("<h1>Plan</h1>", '<img src="//evil.example/x.png">'));
  const v2 = validateArtifact(good.replace("--x:0", "--x:0;background:url(http://evil.example/b.png)"));
  assert.ok(v1.length > 0 && v2.length > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/validate-artifact.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// ABOUTME: Zero-dependency linter that proves an HTML artifact is self-contained:
// ABOUTME: valid root tags and no external (http/https/protocol-relative) references.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Matches src=, href=, and css url(...) targets that escape the file.
const EXTERNAL = /(?:\b(?:src|href)\s*=\s*["']|url\(\s*["']?)\s*(https?:|\/\/)/gi;

export function validateArtifact(html) {
  const violations = [];

  if (!/<!doctype html>/i.test(html) && !/<html[\s>]/i.test(html)) {
    violations.push("missing required HTML root (need <!doctype html> or <html>)");
  }

  let m;
  EXTERNAL.lastIndex = 0;
  while ((m = EXTERNAL.exec(html)) !== null) {
    const start = m.index;
    const snippet = html.slice(start, Math.min(html.length, start + 80)).replace(/\s+/g, " ");
    violations.push(`external reference (must be inline/data:): ${snippet}`);
  }
  return violations;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node scripts/validate-artifact.mjs <file.html>");
    process.exitCode = 1;
    return;
  }
  const violations = validateArtifact(await readFile(file, "utf8"));
  if (violations.length) {
    console.error(`${file} is not self-contained:\n` + violations.map((v) => `  ${v}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`${file}: self-contained OK`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/validate-artifact.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-artifact.mjs scripts/validate-artifact.test.mjs
git commit -m "feat: add self-contained HTML artifact validator"
```

---

## Phase B — Remove plumbing & de-brand

### Task 3: Delete sync script + agent-native workflow, repoint package.json

**Files:**
- Delete: `scripts/sync-agent-native-plan-skills.mjs`
- Delete: `.github/workflows/update-agent-native-plan-skills.yml`
- Modify: `package.json`

- [ ] **Step 1: Delete the agent-native sync apparatus**

```bash
git rm scripts/sync-agent-native-plan-skills.mjs
git rm .github/workflows/update-agent-native-plan-skills.yml
```

- [ ] **Step 2: Rewrite `package.json`**

Replace the whole file with (substitute `agent-skills` with your preferred name if desired — this is the one place the project name is set):

```json
{
  "name": "agent-skills",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "description": "Small, composable, self-contained skills for coding agents. No external services.",
  "license": "MIT",
  "scripts": {
    "test": "node --test",
    "check": "node --test && node scripts/check-no-builder.mjs"
  }
}
```

- [ ] **Step 3: Verify scripts resolve**

Run: `npm run test`
Expected: PASS — the 9 tests from Tasks 1–2 run and pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove agent-native sync script and workflow, repoint npm scripts"
```

---

### Task 4: Replace CI workflow with a Builder-free check

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Replace the file contents**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm run check
```

- [ ] **Step 2: Verify the command the workflow runs**

Run: `npm run check`
Expected: tests PASS; the `check-no-builder` scan currently FAILS (still-branded files). That is expected until Task 15; do not treat this red as done. (Optionally skip pushing until Task 16 makes it green.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: replace agent-native sync check with self-contained guard"
```

---

### Task 5: De-brand the plugin manifests

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `.codex-plugin/plugin.json`

- [ ] **Step 1: Rewrite `.claude-plugin/plugin.json`**

```json
{
  "name": "agent-skills",
  "displayName": "Agent Skills",
  "description": "Small, composable, self-contained skills for coding agents: docs-first discipline, autonomous execution, cross-agent review, efficient orchestration, clear status recaps, and local visual plan/recap modes.",
  "author": {
    "name": "Joshua Oliphant"
  },
  "license": "MIT",
  "keywords": ["skills", "agent-workflows", "subagents"],
  "skills": "./skills/"
}
```

- [ ] **Step 2: Rewrite `.claude-plugin/marketplace.json`**

```json
{
  "name": "agent-skills",
  "owner": {
    "name": "Joshua Oliphant"
  },
  "description": "Small, composable, self-contained skills for coding agents.",
  "plugins": [
    {
      "name": "agent-skills",
      "source": "./",
      "displayName": "Agent Skills",
      "description": "Small, composable, self-contained skills for coding agents.",
      "author": {
        "name": "Joshua Oliphant"
      },
      "license": "MIT",
      "keywords": ["skills", "agent-workflows", "subagents"]
    }
  ]
}
```

- [ ] **Step 3: Rewrite `.codex-plugin/plugin.json`**

```json
{
  "name": "agent-skills",
  "version": "0.0.0",
  "description": "Small, composable, self-contained skills for coding agents.",
  "author": {
    "name": "Joshua Oliphant"
  },
  "license": "MIT",
  "keywords": ["skills", "agent-workflows", "subagents"],
  "skills": "./skills/",
  "interface": {
    "displayName": "Agent Skills",
    "shortDescription": "Self-contained skills for efficient agent workflows.",
    "longDescription": "A small skill collection for docs-first discipline, autonomous execution, cross-agent watchdogging and plan arbitration, efficient model orchestration, clear status recaps, and local visual plan/recap workflows that produce self-contained HTML.",
    "developerName": "Joshua Oliphant",
    "category": "Productivity",
    "capabilities": ["Read", "Write"],
    "defaultPrompt": [
      "Use a matching skill when one applies",
      "Web-search official docs before relying on memory for external APIs",
      "Install the quick recap status convention",
      "Use efficient model orchestration"
    ]
  }
}
```

- [ ] **Step 4: Verify JSON parses**

Run: `node -e "['.claude-plugin/plugin.json','.claude-plugin/marketplace.json','.codex-plugin/plugin.json'].forEach(f=>JSON.parse(require('fs').readFileSync(f)))" && echo OK`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin .codex-plugin
git commit -m "chore: de-brand plugin and marketplace manifests"
```

---

### Task 6: De-brand `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite the README**

Rewrite to remove all Builder/agent-native references. Keep the catalog structure (one section per skill, in the existing order). Apply these exact rules:

- Remove the "Quick install recommended skills" `npx @agent-native/skills` block.
- Remove every `media/` image reference that points at Builder CDN URLs (`https://cdn.builder.io/...`); keep local `media/*.png|gif` images only.
- For `/visual-plan` and `/visual-recap`, replace the description lines that say "Visual plans are MDX, customizable ... viewed with the Agent-Native plans app ... Source here" with one line each:
  - visual-plan: `Produces a self-contained \`plan.html\` you open locally — no account, no server, no external services.`
  - visual-recap: `Produces a self-contained \`recap.html\` from a branch/PR/commit diff, opened locally.`
- Replace the entire `## Install` section with the Claude Code plugin path only:

```markdown
## Install

Install as a Claude Code plugin marketplace from this repository:

```sh
/plugin marketplace add joshuaoliphant/agent-skills
/plugin install agent-skills@agent-skills
```

Skills are then namespaced under the plugin (for example, `/agent-skills:quick-recap`). Pull updates with:

```sh
/plugin marketplace update agent-skills
```

You can also copy any `skills/<name>/` folder directly into your agent's skills directory.
```

- Add a one-line provenance note at the bottom (this line is allowlisted by the guard):

```markdown
> Forked from https://github.com/BuilderIO/skills and de-coupled to run fully locally. <!-- provenance -->
```

- [ ] **Step 2: Verify**

Run: `node scripts/check-no-builder.mjs`
Expected: README.md no longer appears in the failure list (other files may still appear).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: de-brand README, local install + provenance note"
```

---

### Task 7: De-brand `CONTRIBUTING.md`

**Files:**
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Edit the coupled sections**

- In "Development setup": remove the `git clone https://github.com/BuilderIO/skills.git` clone-by-URL and the entire "Set up the agent-native framework path" step (the `AGENT_NATIVE_FRAMEWORK_PATH` / `git clone .../agent-native` block).
- In "Repository workflows & checks": replace the description of `npm run check` (which described syncing with agent-native visual plans) with:

```markdown
- Run local checks before opening a PR:
```bash
npm run check
```
This runs the unit tests (`node --test`) and the `check-no-builder` guard, which fails if any shipped file references Builder.io / agent-native.
```

- Remove the bullet list under "What `npm run check` does" that mentions "Syncs skill definitions with the agent-native visual plans" etc.

- [ ] **Step 2: Verify**

Run: `node scripts/check-no-builder.mjs`
Expected: CONTRIBUTING.md no longer in the failure list.

- [ ] **Step 3: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: de-brand CONTRIBUTING, drop agent-native framework setup"
```

---

### Task 8: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rewrite the coupled sections**

- Replace the "What this repo is" published-three-ways bullets so the `@agent-native/skills` npx bullet is removed and the description says skills install via the Claude Code plugin marketplace or by copying the folder.
- Delete the entire "## The visual-plan / visual-recap exception" section (they are no longer synced/generated).
- In "## Commands", remove the `AGENT_NATIVE_FRAMEWORK_PATH` clone/export lines and the `npm run sync:agent-native-plan-skills` line. Replace with:

```markdown
## Commands

```sh
npm test            # run unit tests for the guard scripts (node --test)
npm run check       # tests + check-no-builder guard (fails on Builder/agent-native strings)
node scripts/validate-artifact.mjs plans/<slug>/plan.html   # prove a generated artifact is self-contained
```
```

- In "## Adding or changing a skill", remove references to the agent-native framework and the instruction-style `--update-instructions` framework change; keep the "plain skill = create `skills/<name>/SKILL.md`" guidance.
- Add a short subsection:

```markdown
## Visual skills (visual-plan / visual-recap)

These now produce a single self-contained HTML file under `plans/<slug>/` (all CSS/JS inline, no external network references) opened locally. There is no hosted Plan app, MCP connector, or `npx @agent-native/core` dependency. The correctness contract for the generated HTML lives in `skills/visual-plan/references/artifact.md`. Validate any generated file with `scripts/validate-artifact.mjs`.
```

- [ ] **Step 2: Verify**

Run: `node scripts/check-no-builder.mjs`
Expected: CLAUDE.md no longer in the failure list.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for locally-owned visual skills"
```

---

### Task 9: Rewrite `.agents/skills/adding-a-skill/SKILL.md`

**Files:**
- Modify: `.agents/skills/adding-a-skill/SKILL.md`

- [ ] **Step 1: Replace the body**

Keep the frontmatter `name: adding-a-skill` but rewrite `description` to drop the `@agent-native/skills` / framework language. Replace the body with a local version:

```markdown
# Adding A Skill

Use this when adding or changing a skill in this repo. Keep ordinary skill
changes in `skills/<skill-name>/`; keep repo-only guidance under `.agents/skills/`.

## Plain skill checklist

1. Create or update `skills/<skill-name>/SKILL.md` with `name` and `description`
   frontmatter (the `description` is the trigger — write it as "Use when…").
2. Add `skills/<skill-name>/README.md` when the skill should appear in the root
   catalog.
3. Keep `SKILL.md` concise; put only essential agent instructions there. Extra
   docs go under `skills/<skill-name>/references/`.
4. If the collection positioning changes, keep `README.md`,
   `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, and `package.json`
   descriptions consistent.
5. Run `npm run check` (unit tests + the Builder/agent-native guard). All shipped
   skill files must stay free of external-service references.

## Visual skills

`visual-plan` and `visual-recap` are normal local skills — no generated/synced
copies, no external renderer. Their output is a self-contained HTML file; the
HTML correctness contract is `skills/visual-plan/references/artifact.md`.
```

- [ ] **Step 2: Verify**

Run: `node scripts/check-no-builder.mjs`
Expected: `.agents/skills/adding-a-skill/SKILL.md` no longer in the failure list.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/adding-a-skill/SKILL.md
git commit -m "docs: rewrite adding-a-skill guide for local model"
```

---

## Phase C — Thinking skills install lines

### Task 10: Replace the install line in the 8 thinking-skill READMEs

**Files (Modify):**
- `skills/agent-watchdog/README.md`
- `skills/efficient-fable/README.md`
- `skills/efficient-frontier/README.md`
- `skills/plan-arbiter/README.md`
- `skills/plow-ahead/README.md`
- `skills/quick-recap/README.md`
- `skills/read-the-damn-docs/README.md`
- `skills/stay-within-limits/README.md`

- [ ] **Step 1: For each README, replace the `npx @agent-native/skills@latest add --skill <name>` install block**

Replace each occurrence (the lines may carry `--update-instructions`) with this block, substituting the real `<name>`:

```markdown
Install via the Claude Code plugin marketplace (see the root README), or copy `skills/<name>/` into your agent's skills directory.
```

Important: `skills/stay-within-limits/README.md` ALSO contains a legitimate, unrelated `npx -y ccusage@latest blocks --active --json` line — **leave that one**; it is not a Builder reference and the guard does not flag it.

- [ ] **Step 2: Verify**

Run: `node scripts/check-no-builder.mjs`
Expected: none of the 8 `skills/*/README.md` files appear in the failure list.

- [ ] **Step 3: Commit**

```bash
git add skills/*/README.md
git commit -m "docs: replace agent-native install lines in thinking-skill READMEs"
```

---

## Phase D — Rewrite the visual skills (core)

### Task 11: Create `references/artifact.md` (the house-rules doc)

**Files:**
- Create: `skills/visual-plan/references/artifact.md`

- [ ] **Step 1: Write the file**

```markdown
# Self-Contained HTML Artifact — House Rules

The deliverable of `/visual-plan` and `/visual-recap` is ONE self-contained HTML
file: `plans/<slug>/plan.html` (plans) or `plans/<slug>/recap.html` (recaps).
You write the HTML/CSS/JS yourself each time, tuned to the content. There is no
template and no shared stylesheet to copy verbatim — design it well for THIS
plan. These are the non-negotiable correctness rules, not style rules.

## Hard rules (a generated file that breaks these is a defect)

1. **One file, everything inline.** All CSS in a `<style>` tag, all JS in a
   `<script>` tag, in the same file. No external `.css`/`.js`.
2. **No external network references at all.** No `https://`, `http://`, or
   `//host` URLs in `src`, `href`, `url(...)`, `@import`, `<link>`, or
   `<script src>`. No Google Fonts, no CDN scripts, no remote images.
   - Images: inline as `data:` base64, or inline `<svg>`. Prefer drawn SVG/CSS
     over raster.
   - Fonts: use the system font stack
     (`font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;`).
     If you must embed a font, `@font-face` with a base64 `data:` `src`.
3. **Valid document.** Start with `<!doctype html>` and include
   `<html>`, `<head>` (with `<meta charset="utf-8">` and a `<title>`), `<body>`.
4. **Self-validate before handoff.** After writing the file, run
   `node scripts/validate-artifact.mjs plans/<slug>/plan.html` and fix any
   reported violation before reporting the file to the user.

## Quality floor

- Use CSS custom properties for a small token set (colors, spacing, radius) at
  `:root` so the document is internally consistent. Support a dark scheme with
  `@media (prefers-color-scheme: dark)` when practical.
- Make it scannable: a sticky or top contents/section list for long plans,
  clear headings, generous spacing.
- Keep interactivity dependency-free vanilla JS (tabs, collapse/expand,
  before/after toggle). Degrade gracefully with JS off where reasonable.
- Accessibility: real headings, `alt` on images, sufficient contrast, focusable
  controls.

## Optional skeletons (copy or ignore — not a required kit)

Tabs (for grouped key-change diffs):

```html
<div class="tabs" role="tablist">
  <button role="tab" aria-selected="true" data-tab="t1">file-a.ts</button>
  <button role="tab" aria-selected="false" data-tab="t2">file-b.ts</button>
</div>
<section id="t1" class="panel">…</section>
<section id="t2" class="panel" hidden>…</section>
<script>
document.querySelectorAll('[role=tab]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[role=tab]').forEach((x) => x.setAttribute('aria-selected', x === b));
  document.querySelectorAll('.panel').forEach((p) => (p.hidden = p.id !== b.dataset.tab));
}));
</script>
```

Split diff (two-column before/after):

```html
<div class="diff" style="display:grid;grid-template-columns:1fr 1fr;gap:1px">
  <pre class="before"><code>old line</code></pre>
  <pre class="after"><code>new line</code></pre>
</div>
```

## Content quality

For wireframes, before/after comparisons, diffs, file trees, data-model and
api-endpoint summaries, and diagrams, follow the principles in:

- `references/wireframe.md` — what a good wireframe looks like.
- `references/document-quality.md` — what a serious technical plan reads like.
- `references/exemplar.md` — a worked self-contained example.

These describe *what good looks like*; render them however suits the content,
within the hard rules above.
```

- [ ] **Step 2: Commit**

```bash
git add skills/visual-plan/references/artifact.md
git commit -m "feat: add self-contained HTML house-rules reference"
```

---

### Task 12: Reframe the existing reference docs for local HTML

**Files:**
- Modify: `skills/visual-plan/references/wireframe.md`
- Modify: `skills/visual-plan/references/canvas.md`
- Modify: `skills/visual-plan/references/document-quality.md`
- Modify: `skills/visual-plan/references/exemplar.md`

- [ ] **Step 1: `wireframe.md` — strip renderer-specifics, keep principles**

- Remove any instruction tying wireframes to `<Screen surface=...>`, `WireframeBlock`, `--wf-*` tokens owned by the agent-native renderer, the "no `<html>`/`<style>`/font tags" rule (that rule existed because their renderer injected the frame — we now own the whole document, so a wireframe is just semantic HTML + our CSS).
- Keep all geometry/quality guidance: full-width chrome, pinned bottom bars, realistic product content, before/after comparability, when to stack vs. columns.
- Add one line at the top: `Wireframes are plain semantic HTML styled by the document's own inline CSS (see references/artifact.md). Use CSS variables you define at :root; there is no external token system.`

- [ ] **Step 2: `canvas.md` — trim to layout principles**

- Remove agent-native artboard/kit mechanics (`contentPatches`, `targetId`/`placement` anchor APIs, the legacy `<FrameScreen>/<Card>/<Row>/<Btn>` kit, `surface` preset machinery).
- Keep the conceptual guidance: when a top "canvas"/storyboard helps, one artboard per user-visible state, keep product screens separate from explanatory diagrams.
- Reframe as: a "canvas" is just a horizontal row of wireframe panels at the top of the HTML document.

- [ ] **Step 3: `document-quality.md` — drop block-tag references**

- Remove references to native block tags (`question-form`, `diagram`, `data-model` as MDX components) and `get-plan-blocks`.
- Keep the writing-quality bar: outcome-first, prose-first, self-contained, open questions collected at the bottom, pre-handoff check.
- Where it named MDX blocks, rephrase to HTML sections (e.g., "a data-model block" → "a data-model summary section/table").

- [ ] **Step 4: `exemplar.md` — replace with a self-contained worked example**

Replace the body with a compact, complete example that obeys `artifact.md`. Include a minimal but real `plan.html` skeleton so an engineer sees the bar:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Plan: Add saved-search filters</title>
  <style>
    :root { --bg:#fff; --fg:#111; --muted:#666; --accent:#2563eb; --line:#e5e7eb; --radius:10px; }
    @media (prefers-color-scheme: dark){ :root{ --bg:#0b0d10; --fg:#e6e8eb; --muted:#9aa3ad; --line:#1f242b; } }
    body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:var(--bg); color:var(--fg); line-height:1.55; }
    main { max-width: 860px; margin: 0 auto; padding: 32px 20px 96px; }
    h1 { font-size: 1.7rem; } h2 { margin-top: 2rem; border-bottom:1px solid var(--line); padding-bottom:.3rem; }
    .wire { border:1px solid var(--line); border-radius:var(--radius); padding:14px; }
    .diff { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--line); border-radius:var(--radius); overflow:hidden; }
    .diff pre { margin:0; padding:10px; background:var(--bg); overflow:auto; font-size:.85rem; }
  </style>
</head>
<body>
  <main>
    <h1>Plan: Add saved-search filters</h1>
    <p>Outcome-first summary of what changes and why…</p>
    <h2>UI</h2>
    <div class="wire"><!-- semantic HTML wireframe of the surface --></div>
    <h2>Key change</h2>
    <div class="diff"><pre class="before"><code>// old</code></pre><pre class="after"><code>// new</code></pre></div>
    <h2>Open questions</h2>
    <ul><li>…</li></ul>
  </main>
</body>
</html>
```

Also keep a short "anti-patterns to avoid" list (padding/filler, single-step plans, external fonts/CDNs, wireframes from memory).

- [ ] **Step 5: Verify all references are Builder-free**

Run: `node scripts/check-no-builder.mjs`
Expected: no `skills/visual-plan/references/*` files in the failure list.

- [ ] **Step 6: Commit**

```bash
git add skills/visual-plan/references
git commit -m "docs: reframe visual-plan references for self-contained local HTML"
```

---

### Task 13: Rewrite `skills/visual-plan/SKILL.md`

**Files:**
- Modify: `skills/visual-plan/SKILL.md`

This is the largest rewrite. Work section-by-section against the current file.

- [ ] **Step 1: Frontmatter + intro**

- Keep `name: visual-plan`. Update `description` to: `Turn a plan into a self-contained interactive HTML document (diagrams, file maps, annotated code, wireframes, open questions) saved locally and opened in the browser — no account or external service.`
- Remove `metadata: visibility: exported` (agent-native-specific) unless needed; safe to drop.
- Rewrite the intro paragraphs to describe a local HTML deliverable rather than "Agent-Native Plans … hosted Plan MCP."

- [ ] **Step 2: KEEP these sections largely intact (light edits only to remove tool names)**

- "When To Use"
- "Plan Discipline" (remove the `create-visual-questions` / `update-visual-plan` tool mentions; keep the discipline)
- "Self-Review Before Handoff"
- "Visual Surface Choice"
- The three "read references/…" pointers — but update them to point at the reframed refs AND add a pointer to `references/artifact.md` as the FIRST thing to read.

- [ ] **Step 3: DELETE these sections wholesale (they are agent-native hosted machinery)**

- "Create A Structured Agent-Native Plan — Never Inline"
- "Core Workflow" (the `get-plan-blocks` / `create-visual-plan` / `update-visual-plan` / `get-plan-feedback` / `export-visual-plan` steps)
- "Tool Guidance"
- "Local-Files Privacy Mode"
- "Interpreting comment anchors"
- "Visibility & Sharing"
- "Setup & Authentication"

- [ ] **Step 4: ADD a new "Deliverable" section in place of the deleted workflow**

Insert this section (replaces the old "Create A Structured…" + "Core Workflow"):

```markdown
## Deliverable: a self-contained local HTML file

The deliverable is ALWAYS one self-contained HTML file, never inline chat prose.
Read `references/artifact.md` first — it is the correctness contract (everything
inline, no external network references, valid document, self-validate).

Workflow:

1. Research the codebase first (see Plan Discipline). Planning is read-only.
2. Choose the visual surface (see Visual Surface Choice). Author the plan as a
   single HTML document under `plans/<slug>/plan.html`, where `<slug>` is
   `YYYY-MM-DD-<short-topic>`. Write all CSS/JS inline; design it for this plan
   (no fixed template). Follow `references/wireframe.md`,
   `references/document-quality.md`, and `references/exemplar.md` for quality.
3. Validate self-containment:
   `node scripts/validate-artifact.mjs plans/<slug>/plan.html`. Fix any
   violation before handoff.
4. Open it for the user: use a browser tool if available, else run `open`
   (macOS) / `xdg-open` (Linux) on the file, else report the absolute path.
   Then ask the user to review and approve before you write code — presenting
   the plan IS the approval gate.
5. Iterate from feedback: the user comments in chat or on the PR. Edit
   `plan.html` directly, re-validate, and reopen. The document is the source of
   truth; keep it standalone (no "this revision changes…" language).
```

- [ ] **Step 5: Fix cross-references**

- The "Wireframe quality", "Canvas", "Document quality", "Good vs. bad exemplar" pointer sections: keep them, but ensure they reference the reframed files and no longer claim the rules are "shared word for word with the renderer."
- Remove the closing "Hosted default: connect https://plan.agent-native.com…" line.

- [ ] **Step 6: Verify**

Run: `node scripts/check-no-builder.mjs`
Expected: `skills/visual-plan/SKILL.md` not in the failure list.

- [ ] **Step 7: Commit**

```bash
git add skills/visual-plan/SKILL.md
git commit -m "feat: rewrite visual-plan to emit self-contained local HTML"
```

---

### Task 14: Rewrite `skills/visual-recap/SKILL.md`

**Files:**
- Modify: `skills/visual-recap/SKILL.md`

- [ ] **Step 1: Frontmatter + intro**

- Keep `name: visual-recap`. Update `description` to: `Turn a PR/branch/commit diff into a self-contained interactive HTML recap (annotated diffs, file maps, API/schema summaries, wireframes) saved locally and opened in the browser.`
- Drop `metadata: visibility: exported`.
- Rewrite the intro to describe building `recap.html` from a diff.

- [ ] **Step 2: DELETE these agent-native sections wholesale**

- "Local-Files Privacy Mode Exception"
- "Always Publish As An Agent-Native Plan — Never Inline"
- "Open And Report The Recap" (the hosted-origin/`openLink.webUrl` URL-resolution machinery)
- "Block reference — call `get-plan-blocks`" (replace, see Step 4)
- "Bidirectional Loop" (the `get-plan-feedback` hosted loop) — replace with a one-paragraph local feedback note.

- [ ] **Step 3: KEEP these sections (light edits to drop tool/tag names)**

- "When To Use", "Recap The Whole Work Unit", "Keep The Recap Body Lean",
  "Recaps Must Be Substantial", "Canonical Shape And Budgets",
  "UI Impact Needs Wireframes", "Before / After Is The Headline",
  "Grounding Rule", "Security".
- "Diff → Block Mapping": KEEP the mapping thinking, but rename "block" → "HTML
  section" and drop the "resolve to the exact JSX tag via get-plan-blocks"
  instructions. Each conceptual block (data-model, api-endpoint, file-tree,
  diff, wireframe, diagram, rich-text) becomes an HTML section you render.

- [ ] **Step 4: ADD the Deliverable section (replaces the publish/open/block-reference machinery)**

```markdown
## Deliverable: a self-contained local HTML file

The deliverable is ALWAYS one self-contained HTML file
`plans/<slug>/recap.html` (`<slug>` = `YYYY-MM-DD-<short-topic>`), never inline
chat prose. Read `references/artifact.md` (in the visual-plan skill:
`../visual-plan/references/artifact.md`) first — it is the correctness contract.

1. Collect the diff with git (`git diff`, `git diff --stat`, `git log`) for the
   whole work unit. Build every structured section mechanically from the real
   diff (see Grounding Rule).
2. Author `recap.html` as a single self-contained document, all CSS/JS inline,
   designed for this change. Use the reframed `../visual-plan/references/`
   docs for wireframe and document quality.
3. Validate: `node scripts/validate-artifact.mjs plans/<slug>/recap.html`. Fix
   any violation before handoff.
4. Open it (browser tool, else `open`/`xdg-open`, else report the path).
5. Feedback is file/chat based: edit `recap.html`, re-validate, reopen. Keep it
   covering the whole work unit unless asked to narrow scope.
```

- [ ] **Step 5: Fix the "Related Skills" + wireframe-pointer sections**

- Keep the wireframe-quality pointer but point at `../visual-plan/references/wireframe.md` and `references/artifact.md`; drop "shared word for word with the renderer" and the `renderMode="design"` agent-native specifics.
- "Related Skills": keep visual-plan link; drop the hosted "comment anchors"/"sharing" cross-refs that referred to deleted sections.

- [ ] **Step 6: Verify**

Run: `node scripts/check-no-builder.mjs`
Expected: `skills/visual-recap/SKILL.md` not in the failure list.

- [ ] **Step 7: Commit**

```bash
git add skills/visual-recap/SKILL.md
git commit -m "feat: rewrite visual-recap to emit self-contained local HTML"
```

---

### Task 15: De-brand the visual-skill READMEs + add `.gitignore`

**Files:**
- Modify: `skills/visual-plan/README.md`
- Modify: `skills/visual-recap/README.md`
- Create/Modify: `.gitignore`

- [ ] **Step 1: Rewrite both visual READMEs**

- Remove all "viewed with the Agent-Native plans app", "Source here", hosted-link, GitHub-action-install, and `npx @agent-native/skills` content.
- Remove `https://cdn.builder.io/...` image references; keep local `media/` images only if present.
- State the deliverable: a self-contained `plan.html` / `recap.html` opened locally; install via the plugin marketplace or by copying the folder.

- [ ] **Step 2: Add `plans/` to `.gitignore`**

Append (create the file if missing):

```gitignore
# Generated visual-plan / visual-recap artifacts (scratch review output)
plans/
```

- [ ] **Step 3: Verify**

Run: `node scripts/check-no-builder.mjs`
Expected: the two visual README files not in the failure list.

- [ ] **Step 4: Commit**

```bash
git add skills/visual-plan/README.md skills/visual-recap/README.md .gitignore
git commit -m "docs: de-brand visual-skill READMEs, ignore generated plans/"
```

---

## Phase E — Smoke test & final guard

### Task 16: End-to-end smoke + green guard

**Files:**
- Temporary: `plans/smoke/plan.html`, `plans/smoke/recap.html` (gitignored, not committed)

- [ ] **Step 1: Generate a sample plan artifact from the exemplar**

Create `plans/smoke/plan.html` by copying the exemplar skeleton from
`skills/visual-plan/references/exemplar.md` and filling the sections with any
small real example.

- [ ] **Step 2: Validate it is self-contained**

Run: `node scripts/validate-artifact.mjs plans/smoke/plan.html`
Expected: `plans/smoke/plan.html: self-contained OK`

- [ ] **Step 3: Negative check — confirm the validator catches a regression**

Temporarily add `<link rel="stylesheet" href="https://fonts.googleapis.com/x">` to the file and re-run the validator.
Expected: exit non-zero with an "external reference" violation. Then remove the line.

- [ ] **Step 4: Open it to confirm it renders**

Run: `open plans/smoke/plan.html` (macOS) or `xdg-open plans/smoke/plan.html` (Linux).
Expected: the document renders in the browser with no console network errors. Delete `plans/smoke/` afterward.

- [ ] **Step 5: Full guard must be green**

Run: `npm run check`
Expected: all unit tests PASS and `check-no-builder` prints `No Builder/agent-native references found.` If any file is still flagged, fix it (it belongs to one of Tasks 5–15) and re-run.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "test: smoke-test self-contained artifacts; repo is Builder-free"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Decision 1 (single-file HTML) → Tasks 11–15 (artifact.md hard rules, SKILL rewrites, validator).
- Decision 2 (free-write + house-rules doc) → Task 11 (`artifact.md`), Tasks 13–14 (SKILLs reference it, no inlined template).
- Decision 3 (file lifecycle: `plans/<slug>/`, gitignore, auto-open, file/chat feedback) → Tasks 13–15.
- Decision 4 (8 thinking skills, install line only) → Task 10.
- Decision 5 (plumbing removal + de-brand: sync script, both workflows, package.json scripts, manifests, README, CONTRIBUTING, CLAUDE.md, adding-a-skill) → Tasks 3–9.
- Spec "Testing" section (no-builder grep guard, self-containment validator, smoke) → Tasks 1, 2, 16.
- Open questions: canvas.md trim → Task 12 Step 2; CI decision → Task 4 (kept, Builder-free); plugin name → Task 4/5 (`agent-skills`, overridable); provenance attribution → Task 6 (allowlisted line).

**Placeholder scan:** No "TBD/TODO". Doc-rewrite tasks specify exact keep/delete/replace section lists and full text for all new files (scripts, artifact.md, exemplar skeleton, manifests, package.json) rather than "rewrite appropriately".

**Type/name consistency:** `findForbidden` (Task 1) and `validateArtifact` (Task 2) names match between implementation, tests, and CLI use in Tasks 8/13/14/16. Output dir `plans/<slug>/` and filenames `plan.html`/`recap.html` consistent across Tasks 11–16. Project name `agent-skills` consistent across package.json + both manifest tasks.
```