// ABOUTME: Tests for the self-contained-HTML validator used by the visual skills
// ABOUTME: to prove a generated plan/recap has no external dependencies.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateArtifact } from "./validate-artifact.mjs";

// Full well-formed fixture — must produce zero violations.
const good = `<!doctype html><html><head><meta charset="utf-8"><title>P</title><style>:root{--x:0}</style></head><body><h1>Plan</h1><img src="data:image/png;base64,AAAA"><script>0</script></body></html>`;

test("clean self-contained file has no violations", () => {
  assert.deepEqual(validateArtifact(good), []);
});

test("flags missing required html tags", () => {
  const v = validateArtifact("<div>no doctype or html</div>");
  assert.ok(v.some((m) => /required HTML/i.test(m)));
});

test("flags an external script", () => {
  const v = validateArtifact(
    good.replace("<script>0</script>", '<script src="https://cdn.example.com/x.js"></script>'),
  );
  assert.ok(v.some((m) => /external reference/i.test(m) && /cdn\.example\.com/.test(m)));
});

test("flags an external font / stylesheet link", () => {
  const v = validateArtifact(
    good.replace("</head>", '<link rel="stylesheet" href="https://fonts.googleapis.com/x"></head>'),
  );
  assert.ok(v.some((m) => /external reference/i.test(m)));
});

test("flags protocol-relative and css url() externals", () => {
  const v1 = validateArtifact(
    good.replace("<h1>Plan</h1>", '<img src="//evil.example/x.png">'),
  );
  const v2 = validateArtifact(
    good.replace("--x:0", "--x:0;background:url(http://evil.example/b.png)"),
  );
  assert.ok(v1.length > 0 && v2.length > 0);
});

test("flags @import with external URL (string form)", () => {
  const withImport = good.replace(
    "<style>:root{--x:0}</style>",
    '<style>@import "https://fonts.googleapis.com/css2?family=Roboto"; :root{--x:0}</style>',
  );
  const v = validateArtifact(withImport);
  assert.ok(v.some((m) => /external reference/i.test(m)));
});

test("flags external srcset attribute", () => {
  const v = validateArtifact(
    good.replace("<h1>Plan</h1>", '<img srcset="https://example.com/img.png 2x">'),
  );
  assert.ok(v.some((m) => /external reference/i.test(m)));
});

test("does not flag navigational <a href> links", () => {
  const withAnchor = good.replace("</body>", '<a href="https://example.com">link</a></body>');
  assert.deepEqual(validateArtifact(withAnchor), []);
});

test("flags missing meta charset", () => {
  const v = validateArtifact(good.replace('<meta charset="utf-8">', ""));
  assert.ok(v.some((m) => /charset/i.test(m)));
});

test("flags missing title element", () => {
  const v = validateArtifact(good.replace("<title>P</title>", ""));
  assert.ok(v.some((m) => /title/i.test(m)));
});

test("flags missing body element", () => {
  const noBody = good.replace(
    '<body><h1>Plan</h1><img src="data:image/png;base64,AAAA"><script>0</script></body>',
    "",
  );
  const v = validateArtifact(noBody);
  assert.ok(v.some((m) => /body/i.test(m)));
});
