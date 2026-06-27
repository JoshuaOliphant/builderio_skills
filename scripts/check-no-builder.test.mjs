// ABOUTME: Tests for the forbidden-string detector that keeps Builder/agent-native
// ABOUTME: references out of shipped skill files and manifests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { findForbidden } from "./check-no-builder.mjs";

test("flags @agent-native reference (collapsed to agent-native label)", () => {
  assert.deepEqual(
    findForbidden("install with npx @agent-native/skills@latest add"),
    ["agent-native"],
  );
});

test("flags a bare agent-native reference", () => {
  assert.deepEqual(findForbidden("the agent-native framework path"), ["agent-native"]);
});

test("flags dotted agent-native forms (regression: dotted hole closed)", () => {
  assert.deepEqual(
    findForbidden("see agent-native.io and agent-native.dev"),
    ["agent-native"],
  );
});

test("flags builder.io and agent-native together", () => {
  assert.deepEqual(
    findForbidden("see builder.io and plan.agent-native.com and BuilderIO").sort(),
    ["agent-native", "builder.io"].sort(),
  );
});

test("flags BuilderIO as builder.io", () => {
  assert.deepEqual(findForbidden("just BuilderIO here"), ["builder.io"]);
});

test("allows clean text", () => {
  assert.deepEqual(findForbidden("a self-contained local html plan"), []);
});

test("allows an explicit provenance attribution line", () => {
  const line = "Forked from https://github.com/BuilderIO/skills <!-- provenance -->";
  assert.deepEqual(findForbidden(line), []);
});
