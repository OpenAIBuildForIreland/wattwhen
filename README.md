# WattWhen

**When should you use, store and sell your electricity?** WattWhen reads
Ireland's live grid (EirGrid), the solar forecast (Met Éireann) and your
household setup, and tells you the cheapest and cleanest time to charge the
car, run the washing or soak up your solar.

The assistant and bill reader run on Claude Haiku 4.5.

Built at **OpenAI Build for Ireland** (OpenAI × Give(a)Go × Dogpatch Labs),
4 October 2026.

## Live Site

[Click here](https://wattwhen-nine.vercel.app)

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

## Data

- [EirGrid Smart Grid Dashboard](https://www.smartgriddashboard.com/): grid carbon intensity, wind forecast, demand
- [Met Éireann open data](https://www.met.ie/climate/available-data): hourly solar radiation forecast
- [PVGIS, EU Joint Research Centre](https://re.jrc.ec.europa.eu/pvg_tools/en/): annual solar output by month
- Supplier tariffs: hand-built table, sources in `src/lib/tariffs.ts`
- Household profiles: synthetic, labelled in the app

Details and quirks: [`docs/data-sources.md`](docs/data-sources.md).

## For contributors and agents

Start with [`AGENTS.md`](AGENTS.md), then `docs/`. Skills for Claude Code
(`.claude/skills/`) and Codex (`.agents/skills/`) and MCP servers (`.mcp.json`,
`.codex/config.toml`) come with the repo.
