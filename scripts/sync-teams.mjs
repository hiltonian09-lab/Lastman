// One-off sync: fetch current squads for each supported league from football-data.org
// and emit a SQL migration file. Run with: node scripts/sync-teams.mjs
// Re-run and re-apply whenever a league's team list changes (promotion/relegation).

import { writeFileSync } from "node:fs";

const TOKEN = process.env.FOOTBALL_DATA_API_TOKEN;
if (!TOKEN) {
  console.error("Set FOOTBALL_DATA_API_TOKEN in your shell before running this script.");
  process.exit(1);
}

const LEAGUES = [
  { id: "lg_pl", code: "PL" },
  { id: "lg_elc", code: "ELC" },
  { id: "lg_pd", code: "PD" },
  { id: "lg_sa", code: "SA" },
  { id: "lg_bl1", code: "BL1" },
  { id: "lg_fl1", code: "FL1" },
];

function sqlEscape(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  const statements = [];

  for (const league of LEAGUES) {
    const res = await fetch(`https://api.football-data.org/v4/competitions/${league.code}/teams`, {
      headers: { "X-Auth-Token": TOKEN },
    });
    if (!res.ok) {
      throw new Error(`${league.code} failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    console.log(`${league.code}: ${data.teams.length} teams`);

    for (const team of data.teams) {
      const id = `team_${team.id}`;
      statements.push(
        `INSERT INTO teams (id, name, short_name, crest_url, league_id, provider_id) VALUES (${sqlEscape(id)}, ${sqlEscape(team.name)}, ${sqlEscape(team.shortName)}, ${sqlEscape(team.crest)}, ${sqlEscape(league.id)}, ${sqlEscape(team.id)}) ON CONFLICT (provider_id) DO UPDATE SET name = excluded.name, short_name = excluded.short_name, crest_url = excluded.crest_url, league_id = excluded.league_id;`,
      );
    }

    // stay well under the 10 req/min free-tier limit
    await new Promise((r) => setTimeout(r, 7000));
  }

  const outPath = new URL("../migrations/0003_seed_teams.sql", import.meta.url);
  writeFileSync(outPath, statements.join("\n") + "\n");
  console.log(`Wrote ${statements.length} statements to migrations/0003_seed_teams.sql`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
