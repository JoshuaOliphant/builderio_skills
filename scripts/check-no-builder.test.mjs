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
