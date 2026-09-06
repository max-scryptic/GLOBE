# AGENTS.md

## Repository expectations

- Inspect the project structure before making changes.
- Keep edits focused and avoid unrelated refactors.
- Ask before adding new production dependencies.
- Run relevant tests or build checks after code changes when available.

## Setup notes

- package-lock.json: use npm install
- pnpm-lock.yaml: use pnpm install
- yarn.lock: use yarn install
- If no setup command is obvious, inspect the repo before installing anything.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
