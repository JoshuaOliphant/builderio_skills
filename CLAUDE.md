# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **catalog of small, composable skills for coding agents** (Claude Code, Codex, Cursor, Copilot, etc.) — not an application. There is no build step and intentionally **zero npm runtime dependencies**. The "code" is prose: each skill is markdown instructions an agent reads at runtime.

Skills install via the Claude Code plugin marketplace or by copying a skill folder directly:

- **Claude Code plugin marketplace** — `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` point at `./skills/`. Installs namespaced as `agent-skills:<skill>`.
- **Codex plugin** — `.codex-plugin/plugin.json`, also pointing at `./skills/`.

## Skill anatomy

Each skill is `skills/<name>/`:

- `SKILL.md` — **required.** YAML frontmatter with `name` and `description` (the `description` is what makes the skill trigger, so write it as "Use when…"), followed by the agent instructions. Keep it concise; put only essential instructions here.
- `README.md` — optional, the public catalog page. Add one when the skill should appear in the root `README.md` listing.
- `references/` — optional supporting docs (see `visual-plan/references/`).

## Commands

```sh
npm test            # run unit tests for the guard scripts (node --test)
npm run check       # tests + check-no-builder guard (fails on old external-service strings)
node scripts/validate-artifact.mjs plans/<slug>/plan.html   # prove a generated artifact is self-contained
```

## Adding or changing a skill

`.agents/skills/adding-a-skill/SKILL.md` is the canonical, repo-specific guide — read it for the full checklist. In short:

- **Plain skill:** create `skills/<name>/SKILL.md` (+ `README.md` if it belongs in the catalog).
- If the collection's positioning changes, keep the descriptions in `README.md`, `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, and `package.json` consistent.

## Visual skills (visual-plan / visual-recap)

These now produce a single self-contained HTML file under `plans/<slug>/` (all CSS/JS inline, no external network references) opened locally. There is no hosted Plan app, MCP connector, or external CLI dependency. The correctness contract for the generated HTML lives in `skills/visual-plan/references/artifact.md`. Validate any generated file with `scripts/validate-artifact.mjs`.
