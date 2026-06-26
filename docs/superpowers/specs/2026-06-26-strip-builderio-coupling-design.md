# Design: Strip Builder.io / agent-native coupling, make visual skills produce self-contained local HTML

Date: 2026-06-26
Status: Approved (design); pending implementation plan

## Problem

This repo (a fork of `BuilderIO/skills`) ships a catalog of skills for coding
agents. The intent of the fork is to keep the skills but remove every dependency
on Builder.io / agent-native infrastructure. Today the coupling is lopsided:

- **The 8 "thinking" skills** (`agent-watchdog`, `efficient-fable`,
  `efficient-frontier`, `plan-arbiter`, `plow-ahead`, `quick-recap`,
  `read-the-damn-docs`, `stay-within-limits`) have **zero** agent-native
  dependency in their `SKILL.md` behavior bodies. Their only Builder touch is one
  install line per `README.md`: `npx @agent-native/skills@latest add --skill X`.
- **The 2 visual skills** (`visual-plan`, `visual-recap`) are deeply coupled.
  Their entire deliverable is "publish to the hosted Plan MCP connector at
  `plan.agent-native.com`" via tools like `create-visual-plan`,
  `create-visual-recap`, `get-plan-blocks`, `update-visual-plan`,
  `get-plan-feedback`, `export-visual-plan`. Even the existing "local-files
  privacy mode" is **not actually local**: it shells out to
  `npx @agent-native/core@latest plan local serve`, which runs a bridge that the
  *hosted* agent-native web app reads from to render. No account, but still their
  CLI, their renderer, their MDX block registry.
- **Repo plumbing** exists solely to pull the visual skills *from* Builder:
  `scripts/sync-agent-native-plan-skills.mjs`, `.github/workflows/ci.yml`
  (`npm run check`), and `.github/workflows/update-agent-native-plan-skills.yml`
  (auto-PRs from `BuilderIO/agent-native`). Once we own the visual skills
  locally, this apparatus actively fights local edits.

## Goal

Make the repo fully self-owned with no Builder.io / agent-native strings, and
have the visual skills produce a **self-contained local HTML artifact** that
opens in a browser with no server, no account, no `npx`, no MCP — instead of
publishing to a hosted Plan app.

## Non-goals

- **No coupling to artifact.land / Artifact Hub.** It was used only as
  *inspiration* for the self-contained-artifact pattern (single file, everything
  inline, runs in a sandbox with no external fetch). The skill must not call
  `aland` or reference artifact.land. (A clean self-contained HTML file is, as a
  free side effect, a valid artifact.land artifact the user can publish manually
  if they ever want to — but the skill never knows that platform exists.)
- Not changing what the 8 thinking skills *do* — only their install instructions.
- Not building a renderer, MDX pipeline, local server, or build step.

## Key decisions

### 1. Output format: single self-contained HTML file

Each visual skill writes one `*.html` with **all CSS and JS inline** and **no
external network references** (no external fonts, scripts, or image URLs; images,
if any, are base64). Rationale:

- Self-containment *is* the anti-coupling goal — a file that secretly needs the
  network is not self-contained.
- Opens by double-click / `open`, offline, forever. Zero infrastructure.
- We own 100% of the render; no compiler or hosted app dependency.

JSX was rejected: a `.jsx` file needs a server compiler to view, which would
re-tie viewing to a platform and break the offline property.

### 2. Generation: free-write every run, guided by one "house rules" doc

The agent writes the HTML/CSS/JS itself on every invocation, tuned to the
content. There is **no vendored stylesheet/template that gets inlined verbatim**.
Consistency and correctness come from a single short reference doc, modeled on
the `aland context` pattern (constraints + a couple of optional copyable
skeletons, not a template).

The reference encodes only **correctness invariants**, never aesthetics:

- One self-contained file; all CSS/JS inline.
- No external network/fonts/images; inline or base64 only.
- HTML must be valid (`<!doctype html>`, `<html>`, `<head>`, `<body>`).
- A handful of *quality principles* for the genuinely hard visuals (before/after
  wireframes, split diffs, diagrams) distilled from the existing
  `references/*.md` — reframed as "what good looks like," not "use this kit."
- 2–3 optional skeletons (e.g. a split-diff structure, a tabs toggle) the agent
  may lift or ignore.

Everything about appearance — layout, color, typography, diagram style,
interactivity — stays fully free per run.

Rejected alternatives:
- *Frozen vendored template:* template sameness, can't adapt to content, extra
  maintenance.
- *Pure free-write with no guidance:* silently reintroduces external coupling
  (CDN fonts/scripts) and re-pays the wireframe-quality tuition this repo already
  learned (hence its 650 lines of references).

### 3. File lifecycle

- Write to `plans/<slug>/` (slug like `2026-06-26-<short-topic>`). Visual-plan
  writes `plan.html`; visual-recap writes `recap.html`.
- Add `plans/` to `.gitignore` by default — these are scratch review artifacts,
  not repo history.
- Auto-open in the browser when a browser tool or `open`/`xdg-open` is available;
  otherwise report the absolute file path.
- Feedback loop becomes file/chat-based: reviewer comments in chat or on the PR,
  agent edits the HTML and reopens. (The hosted comment-anchor machinery is
  removed.)

### 4. The 8 thinking skills

Keep their `SKILL.md` bodies untouched. Replace only the install line in each
`README.md` (and any catalog wording) so nothing points at
`npx @agent-native/skills`. The Claude Code plugin marketplace path
(`.claude-plugin/`) already installs them Builder-free; document that as the
install method.

### 5. Repo plumbing removal / de-branding

- Delete `scripts/sync-agent-native-plan-skills.mjs`.
- Delete `.github/workflows/ci.yml` and
  `.github/workflows/update-agent-native-plan-skills.yml` (both exist only to
  sync/check against `BuilderIO/agent-native`). Replace CI, if any is wanted,
  with a lightweight check that does not reference agent-native (decide in the
  plan; may be "none for now").
- Remove the `sync:agent-native-plan-skills` and `check` scripts from
  `package.json`.
- De-brand: root `README.md`, `CONTRIBUTING.md`, `.claude-plugin/plugin.json`,
  `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`, `package.json`
  — remove Builder.io / agent-native naming, install instructions, and the
  "viewed with the Agent-Native plans app" / hosted-link language. Rename the
  plugin/marketplace identity to the user's own.
- Update the repo-local guide `.agents/skills/adding-a-skill/SKILL.md`, which is
  heavily agent-native-specific, to describe the new local model (or remove the
  agent-native-only sections).
- Update the root `CLAUDE.md` so its "visual-plan/visual-recap are generated from
  the framework" section reflects that they are now locally owned.

## Architecture / component view

```
skills/
  visual-plan/
    SKILL.md            # rewritten: local HTML deliverable, discipline kept
    README.md           # de-branded catalog page
    references/
      artifact.md       # NEW: house rules (sandbox-free correctness + skeletons)
      wireframe.md      # kept, reframed as local quality principles
      canvas.md         # kept/trimmed (drop agent-native renderer specifics)
      document-quality.md
      exemplar.md       # updated to a local-HTML worked example
  visual-recap/
    SKILL.md            # rewritten: recap.html from a diff, discipline kept
    README.md
    (references shared via ../visual-plan/references where already cross-linked)
  <8 thinking skills>/  # README install line only

plans/                  # gitignored output dir (created at runtime)
```

Data flow (visual-plan):
1. Agent researches the codebase (unchanged discipline).
2. Agent authors a self-contained `plans/<slug>/plan.html` per `references/`.
3. Agent opens it locally (or prints the path).
4. User reviews, comments in chat/PR; agent edits the HTML and reopens.

Visual-recap is the same, built *from* a git diff into `recap.html`, keeping the
diff→block mapping as diff→HTML-section thinking and the grounding rule (blocks
true-by-construction from the real diff).

## Testing

This repo has no runtime code today; "tests" are validation of the markdown/HTML
contract. The plan should define lightweight checks:

- A check that no skill file references `agent-native`, `builder.io`,
  `plan.agent-native`, `@agent-native`, or `npx @agent-native` (grep-based guard).
- A check that the visual skills' documented output contract requires a
  self-contained file (no external `src`/`href`/`url()`/font references) — at
  minimum stated in the reference and, optionally, a small validator script that
  lints a generated `plan.html` for external references and required HTML tags.
- Smoke: generate one example `plan.html` and one `recap.html` from the
  exemplar and confirm they open and contain no external references.

The implementation plan decides how much of this is automated vs. documented,
honoring the repo's existing "no heavy tooling" posture.

## Risks / open questions for the plan

- How much of `canvas.md` survives once the agent-native renderer is gone (canvas
  was tightly bound to their artboard kit). Likely trimmed to layout principles.
- Whether to keep any CI at all, or go zero-CI until there's something worth
  checking.
- Final plugin/marketplace name to replace `builder-skills`.
- Whether the 8 thinking skills' READMEs should also gain a "this is a fork"
  provenance note (attribution) while removing the install coupling.
