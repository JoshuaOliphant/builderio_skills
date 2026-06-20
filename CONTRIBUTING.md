# Contributing to BuilderIO/skills

Thank you for your interest in contributing! We welcome contributors of all types — code, tests, documentation, and design — and appreciate your time and effort.

This document explains how to report issues, propose changes, and get your pull requests reviewed and merged quickly.

---

## Table of contents

- [How can I contribute?](#how-can-i-contribute)
- [Code of conduct](#code-of-conduct)
- [Filing issues](#filing-issues)
- [Proposing changes (pull requests)](#proposing-changes-pull-requests)
- [Development setup](#development-setup)
- [Verifying changes](#verifying-changes)
- [Code style & commit messages](#code-style--commit-messages)
- [Review process & expectations](#review-process--expectations)
- [License](#license)

---

## How can I contribute?

You can help in many ways:

- Report bugs with a minimal reproducible example.
- Add or improve documentation and skill guidelines.
- Fix bugs and implement small features via PRs.
- Review other people's PRs.

If you're unsure where to start, check the repository issues and look for labels like `good first issue` or `help wanted`.

## Code of conduct

This project follows an inclusive code of conduct. Please be respectful and considerate in all interactions. If there is no CODE_OF_CONDUCT.md in this repo yet, please follow standard community etiquette (be constructive, assume good intent, and be patient).

## Filing issues

When filing an issue, please include:

- A clear, descriptive title.
- A concise description of the problem or request.
- Steps to reproduce (minimum reproducible example preferred).
- Expected vs. actual behavior.
- Environment details (OS, Node version, browser if relevant).
- Any relevant logs, stack traces, or screenshots.

If you're proposing a feature, explain the use case and suggested API or UX.

---

## Proposing changes (Pull Requests)

Follow these steps to propose changes:

1. Fork the repository and create a branch with a descriptive name (e.g. `fix/missing-docs` or `feat/new-skill`).
2. Keep changes small and focused — one logical change per PR. Smaller PRs get reviewed faster.
3. Update or add necessary documentation for your change. 
4. Run `npm run check` and make sure it passes locally before committing.
5. Open a pull request with a clear title and a short summary. Use this structure in the PR body:

   - Summary (one-line)
   - Why (why this change is needed)
   - What changed (bullet list)
   - How to test (steps)
   - Notes (migrations, breaking changes)

6. Request reviews from specific maintainers or teams and explain what you want reviewed (logic, tests, docs).

We recommend creating draft PRs for early feedback on larger changes.

## Development setup

1. Clone and install dependencies:
   ```bash
   git clone [https://github.com/BuilderIO/skills.git](https://github.com/BuilderIO/skills.git)
   cd skills
   npm install
