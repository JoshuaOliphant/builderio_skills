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
