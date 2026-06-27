// scripts/validate-artifact.test.mjs
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
