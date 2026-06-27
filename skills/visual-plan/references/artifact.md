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
