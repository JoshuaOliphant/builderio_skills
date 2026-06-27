// ABOUTME: Shared helpers for the zero-dependency guard scripts.
// ABOUTME: Exports isMain() for CLI entry detection and reportResult() for output.
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Returns true when the script is being run directly from the command line
 * rather than imported by a test or another module.
 */
export function isMain(importMetaUrl) {
  return Boolean(
    process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(importMetaUrl),
  );
}

/**
 * Prints failures (to stderr, indented) and sets exit code 1,
 * or prints the ok message (to stdout) when there are no failures.
 */
export function reportResult(failures, { header, ok }) {
  if (failures.length) {
    console.error(header + "\n" + failures.map((f) => `  ${f}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log(ok);
  }
}
