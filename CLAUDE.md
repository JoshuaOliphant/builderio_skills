# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **catalog of small, composable skills for coding agents** (Claude Code, Codex, Cursor, Copilot, etc.) — not an application. There is no build step and intentionally **zero npm runtime dependencies**. The "code" is prose: each skill is markdown instructions an agent reads at runtime.

The repo is published three ways from the same `skills/` directory:

- **`@agent-native/skills` npx installer** — discovers skills dynamically from `BuilderIO/skills@main`. A new folder under `skills/<name>/` is enough to make `npx @agent-native/skills@latest add --skill <name>` work; there is no registry to edit.
- **Claude Code plugin marketplace** — `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` point at `./skills/`. Installs namespaced as `builder-skills:<skill>`.
- **Codex plugin** — `.codex-plugin/plugin.json`, also pointing at `./skills/`.

## Skill anatomy

Each skill is `skills/<name>/`:

- `SKILL.md` — **required.** YAML frontmatter with `name` and `description` (the `description` is what makes the skill trigger, so write it as "Use when…"), followed by the agent instructions. Keep it concise; put only essential instructions here.
- `README.md` — optional, the public catalog page. Add one when the skill should appear in the root `README.md` listing.
- `references/` — optional supporting docs (see `visual-plan/references/`).

## The visual-plan / visual-recap exception

`skills/visual-plan/` and `skills/visual-recap/` are **generated/synced** from the `BuilderIO/agent-native` framework — do **not** hand-edit them as standalone prose. Their `README.md` files are the one overlay this repo owns and preserves across syncs (`publicDocOverlays` in the sync script); every other file is overwritten from the framework.

- `npm run sync:agent-native-plan-skills` copies them in from the framework.
- `npm run check` (CI, on every PR/push to `main`) asserts they match the framework and fails on drift.
- `.github/workflows/update-agent-native-plan-skills.yml` opens automated `chore: update Agent Native visual skills` PRs when the framework changes — this is the source of most recent commits.

If `npm run check` fails on visual-plan/visual-recap sync while your change is unrelated, **report that specifically** rather than rewriting those skills to make the check pass.

## Commands

Local checks require the framework cloned as a sibling and an env var pointing at it:

```sh
git clone https://github.com/BuilderIO/agent-native.git ../agent-native
export AGENT_NATIVE_FRAMEWORK_PATH=../agent-native   # required for the scripts below
npm install            # no deps, but establishes the workspace
npm run check          # validate visual-plan/visual-recap are in sync (run before any PR)
npm run sync:agent-native-plan-skills   # regenerate visual-plan/visual-recap from the framework
```

The sync script (`scripts/sync-agent-native-plan-skills.mjs`) resolves the framework from `AGENT_NATIVE_FRAMEWORK_PATH` (or `../agent-native/framework`) and tries several known layouts for the source skills before failing.

## Adding or changing a skill

`.agents/skills/adding-a-skill/SKILL.md` is the canonical, repo-specific guide — read it for the full checklist. In short:

- **Plain skill:** create `skills/<name>/SKILL.md` (+ `README.md` if it belongs in the catalog). Dynamic discovery handles installability; no framework change needed.
- **Instruction-style skill** (writes always-on `AGENTS.md`/`CLAUDE.md` lines via `--update-instructions`, like `quick-recap` / `efficient-fable`): needs one extra change in the `agent-native` framework. See the guide.
- **App-backed / MCP skill:** inspect the framework before editing.
- If the collection's positioning changes, keep the descriptions in `README.md`, `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, and `package.json` consistent.
