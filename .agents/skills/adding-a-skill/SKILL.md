---
name: adding-a-skill
description: >-
  Use in this repo when adding, updating, documenting, or validating a public skill.
---

# Adding A Skill

Use this when adding or changing a skill in this repo. Keep ordinary skill
changes in `skills/<skill-name>/`; keep repo-only guidance under `.agents/skills/`.

## Plain skill checklist

1. Create or update `skills/<skill-name>/SKILL.md` with `name` and `description`
   frontmatter (the `description` is the trigger — write it as "Use when…").
2. Add `skills/<skill-name>/README.md` when the skill should appear in the root
   catalog.
3. Keep `SKILL.md` concise; put only essential agent instructions there. Extra
   docs go under `skills/<skill-name>/references/`.
4. If the collection positioning changes, keep `README.md`,
   `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, and `package.json`
   descriptions consistent.
5. Run `npm run check` (unit tests + the de-coupling guard). All shipped skill
   files must stay free of external-service references.

## Visual skills

`visual-plan` and `visual-recap` are normal local skills — no generated/synced
copies, no external renderer. Their output is a self-contained HTML file; the
HTML correctness contract is `skills/visual-plan/references/artifact.md`.
