// ABOUTME: Zero-dependency linter that proves an HTML artifact is self-contained:
// ABOUTME: valid structure and no external (http/https/protocol-relative) resource references.
import { readFile } from "node:fs/promises";
import { isMain, reportResult } from "./lib.mjs";

// Structural patterns — every well-formed artifact must contain each of these.
const STRUCT = [
  {
    re: /<!doctype html>|<html[\s>]/i,
    msg: "missing required HTML root (need <!doctype html> or <html>)",
  },
  { re: /<meta\b[^>]*charset/i, msg: "missing <meta charset> declaration" },
  { re: /<title[\s>]/i, msg: "missing <title> element" },
  { re: /<body[\s>]/i, msg: "missing <body> element" },
];

// External-resource patterns. An <a href> navigational hyperlink is intentionally excluded —
// it does not trigger a resource load and does not break offline rendering.
// Known limitation: an external URL inside an escaped code sample
// (&lt;img src="https://..."&gt;) may still be flagged — accepted false-positive
// of a regex (not full-parser) check.
const EXTERNAL = "(?:https?:|//)";
const PATTERNS = [
  {
    what: "src/srcset/poster",
    re: new RegExp(`\\b(?:src|srcset|poster)\\s*=\\s*["']?\\s*${EXTERNAL}`, "gi"),
  },
  {
    // href on <link> elements (stylesheet, icon, preload) counts as a resource load;
    // href on <a> elements is navigational and is intentionally not matched here.
    what: "<link href>",
    re: new RegExp(`<link\\b[^>]*?\\bhref\\s*=\\s*["']?\\s*${EXTERNAL}`, "gi"),
  },
  {
    what: "css url()",
    re: new RegExp(`url\\(\\s*["']?\\s*${EXTERNAL}`, "gi"),
  },
  {
    what: "@import",
    re: new RegExp(`@import\\s+["']\\s*${EXTERNAL}`, "gi"),
  },
];

export function validateArtifact(html) {
  const violations = [];

  // Structural checks — flag any required element that is absent.
  for (const { re, msg } of STRUCT) {
    if (!re.test(html)) violations.push(msg);
  }

  // External resource checks — each match becomes one violation with a short snippet.
  for (const { re } of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(html)) !== null) {
      const start = m.index;
      const snippet = html.slice(start, Math.min(html.length, start + 80)).replace(/\s+/g, " ");
      violations.push(`external reference (must be inline/data:): ${snippet}`);
    }
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
  reportResult(violations, {
    header: `${file} is not self-contained:`,
    ok: `${file}: self-contained OK`,
  });
}

// Only run when executed directly, not when imported by tests.
if (isMain(import.meta.url)) {
  await main();
}
