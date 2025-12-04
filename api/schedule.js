// /api/schedule.js

export default async function handler(req, res) {
  const year = req.query.year || 2025;
  const week = req.query.week || 1;

  const divisions = {
    FBS: 80,
    FCS: 81,
    D2: 35,
    D3: 36,
    NAIA: 37
  };

  const results = {};

  try {
    for (const [name, group] of Object.entries(divisions)) {
      const url = `https://site.web.api.espn.com/apis/v2/sports/football/college-football/scoreboard?week=${week}&year=${year}&group=${group}`;

      const response = await fetch(url);
      const data = await response.json();

      const games = [];

      if (!data.events) {
        results[name] = [];
        continue;
      }

      for (const event of data.events) {
        const c = event.competitions?.[0];
        if (!c) continue;

        const competitors = c.competitors || [];
        const home = competitors.find(t => t.homeAway === "home");
        const away = competitors.find(t => t.homeAway === "away");

        const homeTeam = home?.team?.displayName || "";
        const awayTeam = away?.team?.displayName || "";

        const matchup = `@ ${homeTeam}`; // UI handles full formatting

        // Handle missing time
        let time = event.date ? new Date(event.date).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit"
        }) : "TBA";

        // Past games may have no time → fallback
        if (event.status?.type?.completed) {
          time = home?.score && away?.score ? (home.score > away.score ? homeTeam : awayTeam) : "Final";
        }

        // TV may not exist
        const tv = c.broadcasts?.[0]?.names?.[0] || "";

        // Past games have a result instead of TV
        let result = "";
        if (home?.score && away?.score) {
          result = `${homeTeam} ${home.score}, ${awayTeam} ${away.score}`;
        }

        games.push({
          time,
          matchup,
          tv,
          result
        });
      }

      results[name] = games;
    }

    res.status(200).json({ week, divisions: results });

  } catch (err) {
    res.status(500).json({ error: "Failed to scrape ESPN", details: err.toString() });
  }
}
