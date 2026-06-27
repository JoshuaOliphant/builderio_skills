---
name: visual-recap
description: >-
  Turn a PR/branch/commit diff into a self-contained interactive HTML recap
  (annotated diffs, file maps, API/schema summaries, wireframes) saved locally
  and opened in the browser.
---

# Visual Recap

`/visual-recap` builds a self-contained `recap.html` **from** a diff, not toward
one. It is the reverse of forward planning: instead of describing the change you
are about to make, you describe the change that was just made, at a higher
altitude than line-by-line review — same structured thinking, in reverse. Schema,
API, file, and architecture changes become the same data-model, API-endpoint,
file-tree, and diagram sections a forward plan would use, only now they summarize
work that exists. A reviewer scans the shape of the change before spending
attention on the literal lines. The deliverable is ONE self-contained HTML file
`plans/<slug>/recap.html` — everything inline, no external network references,
opened locally.

## When To Use

Build a recap when a PR or commit is large, multi-file, or touches schema, API
contracts, or architecture, and a reviewer would benefit from seeing the change
mapped to structured sections before reading the raw diff. An agent can generate
one on request ("recap this PR", "show me what this branch changed"). Skip it for
small, single-file, or obvious diffs — a recap is review overhead, and a tiny
change reviews faster as plain diff.

## Recap The Whole Work Unit

When `/visual-recap` is invoked in a chat thread after work has already happened,
the default scope is the whole current work unit/thread, not only the most recent
user message, tool action, or follow-up fix. Gather the thread-owned changes
across the conversation: original implementation work, later bug fixes, UI
follow-ups, tests, changesets, skill/instruction updates, and any generated
artifacts.

Use the current diff plus conversation context to separate thread-owned changes
from unrelated dirty work that existed before the thread. Exclude unrelated
pre-existing edits. If the scope is genuinely ambiguous and cannot be inferred,
state the assumption or ask a concise question before producing the recap.

When updating an existing recap after feedback, revise the recap so it still
covers the whole thread/work unit plus the new correction. Do not replace a broad
recap with a narrow recap of only the latest feedback unless the user explicitly
asks for that narrower scope.

## Keep The Recap Body Lean

Do not add boilerplate intro, disclaimer, provenance, or summary prose to the
recap body. In particular, do not add a prose section just to say the recap is an
aid, that the reviewer should still review the diff, how many files changed, or
which ref/working tree generated the recap. The recap title, brief, and file-tree
(which carries the per-file change stats) already carry that context.

Only add prose when it tells the reviewer something specific about the change that
the structured sections do not: the objective, a real compatibility risk, an
important decision visible in the diff, or a grounded review note.

## Recaps Must Be Substantial

Lean is not the same as thin. A recap is not a single wireframe plus one
sentence — that under-serves the reviewer as much as boilerplate prose over-serves
them. Alongside the visual/structural headline (wireframes, data-model,
API-endpoint, diagram), a substantial recap also carries the implementation
evidence:

- A short surface/state inventory before authoring: list the changed routes,
  components, popovers/dialogs, role/access states, empty/error states, and
  shared abstractions visible in the diff. The final recap must either represent
  each meaningful item with a section or intentionally omit it because it is tiny,
  redundant, or not user-visible.
- A file-tree of the changed files with each entry's change flag, so the reviewer
  sees the footprint of the work at a glance.
- The split diff of the KEY changed files, grouped under a `## Key changes`
  heading in a single horizontal tabs control (one file per tab), with a one-line
  summary and a few annotations on each — so the reviewer can drop from the
  high-altitude shape straight into the load-bearing code. Use horizontal file
  tabs, not a vertical side rail, so the selected file has enough width for the
  side-by-side diff.

Skip the diff appendix only for a genuinely tiny change that reviews faster as
plain diff (see "When To Use"); for any change worth recapping, the file-tree and
key-change diffs belong in the recap.

## Canonical Shape And Budgets

A strong recap follows one skeleton, top to bottom:

1. UI-impact headline — wireframes first, when the diff changed rendered UI.
2. Short outcome narrative: what changed and why, 1-3 paragraphs.
3. data-model / API-endpoint sections for schema and contract changes.
4. file-tree of the changed files with change flags.
5. `## Key changes` — one horizontal tabs control of split diffs / annotated code.

Budgets that keep the recap reviewable:

- 3-8 key-change tabs. Fewer than 3 on a large change under-serves the
  reviewer; more than 8 stops being a summary.
- Keep each diff/annotated-code excerpt focused — prefer under ~150 lines per
  tab; summarize or link the rest of a long file instead of dumping it.
- Title at most ~70 characters; brief 1-3 sentences.

**GOOD.** A 25-file auth change: Before/After wireframes of the login surface,
a two-paragraph narrative, a diff-aware data-model of the sessions table, an
API-endpoint for the new refresh route, a file-tree with change flags, and
`## Key changes` with five focused tabs, each with a one-line summary and a
few annotations on the load-bearing hunks.

**BAD.** One giant unsegmented diff dump with no summaries or annotations; or a
sparse three-section recap of a 40-file change (one wireframe, one sentence, one
file list) that forces the reviewer back into the raw diff anyway.

## UI Impact Needs Wireframes

When the diff changes rendered UI, layout, density, visual state, interaction
affordances, navigation, controls, menus, dialogs, or design tokens, the recap
MUST include one or more wireframes. Prose and file diffs are not a substitute
for showing what changed visually.

Before choosing wireframes, make a UI coverage pass from the diff:

- Identify the entry surface where the change appears, such as a page header,
  list row, toolbar, route shell, or menu trigger.
- Identify the interaction surface that opens or changes, such as a popover,
  dialog, tab, sheet, dropdown, inline editor, or toast.
- Identify the resulting destination or persistent state, such as a public page,
  read-only view, empty state, error state, loading state, permission-denied
  state, or saved/shared state.
- Identify access or role variants when permissions change. Owner/admin/editor
  versus viewer/non-manager differences are visual behavior and need a compact
  matrix, paired wireframes, or clearly labeled state sequence.

For UI-heavy PRs, a single before/after of the entry surface is not enough.
Show the changed entry point, the main changed interaction surface, and the
resulting/destination state. Add more states when the diff adds tabs, role-based
controls, public/private visibility, invite/manage flows, destructive controls,
or empty/error branches.

Choose the smallest visual surface that makes the review clear:

- Use a `Before` / `After` wireframe pair when the reviewer benefits from direct
  comparison, such as a removed or added control, a changed state, layout
  density, ordering, navigation, or a visible component replacement.
  `../visual-plan/references/wireframe.md` owns how to lay that pair out (columns
  vs. vertical stack by geometry).
- Use an after-only wireframe when the change is purely additive or the "before"
  state would only show absence without adding review value.
- Use more than two wireframes when the UI change is flow-dependent, responsive,
  or stateful; show the meaningful states in order instead of forcing a single
  before/after pair.
- For tiny surfaces like menus, popovers, dialogs, toasts, or panels, show the
  focused sub-surface. Do not redraw a full page unless placement in the page is
  itself part of the change.

Ground each wireframe in the changed UI behavior, component names, file paths,
and diff-visible labels/states. If exact pixels are inferred rather than
captured, say so in the wireframe caption or a concise annotation.

## Wireframe Quality — read `../visual-plan/references/wireframe.md`

UI recap wireframes must meet a strict quality bar — full-width chrome, pinned
bottom bars, real product content, before/after comparability, the right surface
density, theme tokens instead of hex. Before authoring ANY wireframe, READ
`../visual-plan/references/wireframe.md` and `../visual-plan/references/artifact.md`
— together they are the source of truth for HTML wireframe quality and for the
self-contained-file correctness contract. Do not author wireframes from memory.

When a browser tool is available, open the rendered recap and visually inspect it
at the current theme before reporting. If any label, annotation, toolbar, or
wireframe content overlaps another element, fix the HTML and reopen. A text-match
screenshot is not enough; visually inspect the captured image. When no browser is
available (for example a headless CI agent), state that in the recap handoff
instead.

## Deliverable: a self-contained local HTML file

The deliverable is ALWAYS one self-contained HTML file
`plans/<slug>/recap.html` (`<slug>` = `YYYY-MM-DD-<short-topic>`), never inline
chat prose. Read `../visual-plan/references/artifact.md` first — it is the
correctness contract.

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

## Diff → HTML Section Mapping

Map each kind of change to the HTML section that carries it, derived mechanically
from the actual diff. Each conceptual item below becomes a section you render in
`recap.html`.

- **Schema / migration change** → a **data-model** section for the resulting
  entities, fields, and relations. Flag what moved per field/entity
  (`added` / `modified` / `removed` / `renamed`), and for a changed type show the
  prior value (e.g. the old column type) — grounded in the real migration diff.
  That diff-aware data-model is the headline; reach for a split diff of the
  literal SQL only when the exact statement still matters, not by default.
- **API / action / route change** → an **API-endpoint** section with the method,
  path, params, request, and responses as they are after the change. Flag each
  changed param/response (and the prior type/shape on a param that changed), and
  mark a wholly added or removed route. Mark removed endpoints as deprecated and
  explain in prose. Keep multiple API endpoints in the normal single-column
  document flow unless they are an explicit before/after contract comparison.
  Author each request/response example as a SINGLE valid JSON value — one
  top-level object or array, parseable on its own — so it renders cleanly. Do not
  put `//` or `/* */` comments, prose, trailing commas, or two or more
  concatenated top-level objects inside one example. When an endpoint has several
  distinct message shapes (for example separate websocket frame types, or a
  success body versus an error body), give each its OWN labeled example rather
  than cramming them into one body.
- **Compatibility-sensitive change** → a short **prose** note beside the relevant
  data-model / API-endpoint section. Name the changed field, endpoint, or behavior
  and mark whether it is breaking, risky, or non-breaking; pair that note with a
  split diff for the literal lines.
- **Any meaningful code hunk** → a **split diff** carrying the real before / after
  text and the filename / language. Split layout is the default for recap code
  review because before/after legibility is the point; use a unified hunk only for
  a genuinely narrow standalone change where side-by-side would hide the code.
  Give every diff a one-line summary saying what the hunk changes and why; render
  it as a description above the code so the reviewer reads intent first. Never
  leave a diff unlabeled. For the KEY changed files, attach annotations to the
  diff so the recap calls out what each important hunk does — this is the headline
  affordance for annotating the key files updated. Anchor each annotation to the
  after-side line numbers by default (point at removed lines when needed). Keep it
  to a few high-signal notes per file, not one per line.
  When several key files each need a substantial diff, introduce the group with a
  `## Key changes` heading, then place the diffs under it in a horizontal tabs
  control (one file per tab) so the selected file's split diff gets the full
  document width. Keep each tab label to the file path or a short basename plus
  directory hint. If the recap ends with more than one supporting diff, that
  trailing diff appendix should be one horizontal tabs control under its own
  `## Key changes` heading, not a stack of separate diff sections.
- **Brand-new file or a substantial added block with no meaningful "before"** →
  an **annotated-code** section rather than a one-sided split diff. Carry the real
  new code with its filename / language and anchor a few high-signal notes to the
  lines that matter so the reviewer reads what the new code does, not code for
  code's sake. Keep split diffs for true before/after hunks where the removed
  lines still carry meaning, and group several annotated walkthroughs in a
  horizontal tabs control the same way diffs are grouped.
- **Files added / removed / renamed** → a **file-tree** section with each entry's
  change flag (`added`, `removed`, `modified`, `renamed`) and a short note; attach
  a snippet only when one tells the reviewer something the path does not.
- **Rendered UI / interaction change** → one or more **wireframes** showing the
  visible UI delta before the reviewer reads code. Use Before / After wireframes
  when the comparison clarifies the change; otherwise use after-only or a short
  state/flow sequence. Use realistic UI surfaces: for a popover change, show a
  popover with its title row, top-right actions, options/fields, tabs,
  selected/disabled states, people/lists/rows, and any opened prompt/menu anchored
  to the correct trigger. If a route was added, show the route body and the
  unavailable/empty state when the diff implements one. If permissions changed,
  show what managers can do and what viewers/non-managers see instead. Keep the
  body lean: the wireframe carries the UI story, while the file-tree and diffs
  carry implementation evidence.
- **Architecture or data-flow shift** → a **diagram** section as a two-panel
  before/after, layered, or swimlane layout. Use two-dimensional layouts; do not
  reduce a structural change to a left-to-right chain. Do not use a diagram as a
  stand-in for rendered UI controls; UI changes need wireframes. Author the
  diagram with the same theme tokens `../visual-plan/references/wireframe.md`
  defines — never one-off hex/rgb/hsl literals or one-off dark/light palettes.
- **Outcome-first narrative** → **prose** for the "what changed and why": the
  objective the diff served, the key decisions visible in it, and the risks a
  reviewer should weigh. This is the only place the model writes freely.

## Before / After Is The Headline

The recap's center of gravity is the before/after comparison. For document-body
comparisons there are two primitives, and they cover the whole need together:

- **Side-by-side columns** — for **structured** comparisons. Use two columns
  labeled `Before` and `After`, each holding a section (commonly a data-model,
  API-endpoint, or prose block), so the reviewer reads the old shape against the
  new shape in one glance. This is the right primitive for "the schema went from
  X to Y" or "the endpoint contract changed like this." Do not use columns simply
  to compact or group a list of API endpoints.
- **Split diff** — for **code**. It renders the literal removed and added lines.
  Use it for the actual hunks. Use split layout by default for recap code review;
  reserve a unified hunk for genuinely narrow standalone changes where
  side-by-side would hide the code. Key-file diff groups should use horizontal
  tabs so split diffs get the full document width.

For UI diffs, wireframes are the visual comparison primitive. Use before/after
wireframes when the comparison clarifies the change; use after-only or a state
sequence when that better matches the change. The visual headline must show exact
placement, realistic chrome, and adequate padding before any abstract
explanation. Do not stop at the first visible affordance when the diff adds a
flow; show the entry point, the opened surface, and the resulting state or page so
the reviewer can trace the actual user path. `../visual-plan/references/wireframe.md`
owns the before/after layout choice — narrow surfaces stay side by side and wide
desktop/browser frames stack vertically; never hand-build a side-by-side wireframe
layout from scratch.

## Grounding Rule

Structured sections are **true by construction** only if they are derived from the
actual changed lines. The diff, data-model, API-endpoint, and file-tree sections
MUST be built mechanically from the real diff — real paths, real fields, real
method/path, real before/after text — never inferred, rounded, or invented. The
model writes only the prose: the "why", the narrative, the risk read. A
confidently wrong recap is dangerous in a review context, because a reviewer who
trusts the summary may skip the very line the summary got wrong. When the diff
does not contain a fact, leave it out rather than guess; mark anything the model
inferred (not extracted) as inferred in prose.

## Security

- **Keep recaps local and private.** A recap can expose unreleased schema,
  internal endpoints, and architecture; treat it like the source it summarizes.
  The recap is a local HTML file — keep it out of shared locations unless the user
  asks for it, and do not commit it to a repo where the audience should not see
  the change.
- **Never transcribe secrets.** A diff can contain API keys, tokens, webhook
  URLs, signing secrets, `.env` values, or credential-looking literals. Do not
  copy any of these into a diff, file-tree snippet, API-endpoint, or prose
  section — redact them (`sk-•••`, `<redacted>`). This mirrors the repo's
  hardcoded-secret rule: obviously fake placeholders only, never the real value,
  in any section, caption, or note.

## Related Skills

- **visual-plan** — the canonical command and the source of the shared wireframe,
  artifact, and document-quality references; a recap follows the same section
  discipline in reverse.
