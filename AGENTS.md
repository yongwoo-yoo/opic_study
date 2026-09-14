# Repository Guidelines

## Project Structure & Module Organization

This repository contains a static OPIC study app served through GitHub Pages from `docs/`.

- `docs/index.html`, `app.js`, and `style.css`: study interface, flashcard review logic, and styling.
- `docs/guide.html`: study strategy reference.
- `docs/data/lessons/`: individual lesson JSON files.
- `docs/data/index.json`: generated lesson catalog; regenerate instead of editing manually.
- `docs/sw.js`, `manifest.json`, and `icon.svg`: service worker, app metadata, and icon.
- `scripts/build-index.mjs`: generates the catalog from lesson files.
- `CLAUDE.md`: lesson schema and content workflow; `.claude/skills/add-lesson/` contains the lesson-authoring skill.

## Build, Test, and Development Commands

Run commands from the repository root:

- `node scripts/build-index.mjs`: rebuild the catalog after adding, removing, or updating lessons; requires Node.js with ES module and top-level await support.
- `python3 -m http.server 8000 --directory docs`: serve the app at `http://localhost:8000` for browser checks.
- `node --check docs/app.js` and `node --check docs/sw.js`: check JavaScript syntax.
- `git diff --check`: check changes for whitespace errors.

There is no package installation step, bundler, or configured automated test suite.

## Coding Style & Naming Conventions

Follow surrounding formatting: two-space indentation, single-quoted JavaScript strings, and semicolons. Use `camelCase` for functions and variables, uppercase constants, and kebab-case HTML IDs. No formatter or linter is configured.

Name lessons `YYYY-MM-DD-descriptive-slug.json`. Follow the schema in `CLAUDE.md`, keeping Korean explanations and English practice expressions consistent with existing lessons. Card IDs must be globally unique and must never change after creation: localStorage review progress depends on them.

## Testing Guidelines

No test framework or coverage threshold is configured. Rebuild the catalog to catch malformed lesson JSON. Manually verify the lesson list, notes, guide navigation, card flipping, all three ratings, and persisted progress after reloading. Check mobile layout for interface changes. When changing cached shell assets, update `SHELL_CACHE` in `docs/sw.js` and verify refreshed assets load.

## Commit & Pull Request Guidelines

History uses short, descriptive subjects such as `add guide button to home screen` and `add lesson: …`. Follow that style and keep commits focused. Include regenerated catalog changes with lesson updates.

For pull requests, describe the change and validation performed, link relevant issues, and include screenshots for visible interface changes. Preserve unrelated working-tree edits.
