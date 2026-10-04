# WattWhen

Tells Irish households **when** to use, store and sell electricity, using live
EirGrid grid data, Met Éireann solar forecasts and PVGIS. Built at OpenAI Build
for Ireland, 4 Oct 2026. Submissions close at **16:00**.

## Read first

- `docs/brief.md`: hackathon brief, rules and schedule
- `docs/product.md`: decisions, users, features (must/should/could), demo script
- `docs/data-sources.md`: verified endpoints, response shapes, quirks
- `docs/build-prompt.md`: full build spec and architecture

## Rules

- Keep the OpenAI key on the server (route handlers only). Never expose it to the
  client, never commit `.env.local`.
- Every external fetch retries, caches, and falls back to `src/data/samples/`.
  The UI shows the source and timestamp, and says when it's using a sample.
- Keep facts, estimates and AI apart in the UI: **Data** (sourced),
  **Estimate** (our CO2 forecast, synthetic households, assumptions), **AI**
  (model output).
- The model never does arithmetic. € and CO2 come from code in `src/lib/`.
- Animations use Motion v14: `import { motion } from "motion/react"`.
- 3D uses react-three-fiber v9 + drei. Client components only (`"use client"`).
- Prove the data works before polishing UI. A working demo beats features.

## Skills and MCP

- Skills: `ui-ux-pro-max` (design system, palettes, UX rules), `framer-motion`,
  plus `design`, `ui-styling`, `design-system`. Claude Code reads
  `.claude/skills/`, Codex reads `.agents/skills/`.
- MCP servers: `.mcp.json` (Claude Code) and `.codex/config.toml` (Codex):
  Playwright (look at the running app, take screenshots), Next.js DevTools,
  OpenAI docs, Context7.

## Git

- `main` holds setup and docs. Build features on a branch and merge when they work.
- Commit only files you touched. Don't commit `.env.local`, `.next/` or `node_modules/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
