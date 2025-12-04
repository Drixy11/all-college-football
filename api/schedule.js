// /api/schedule.js
// Returns ALL college football games for a given week/year
// Merged across FBS, FCS, D2/D3, etc., sorted by day/time.

export default async function handler(req, res) {
  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  const week = parseInt(req.query.week, 10) || 1;

  // ESPN "group" IDs
  const DIVISIONS = [
    { key: "FBS", group: 80 },
    { key: "FCS", group: 81 },
    { key: "D2/D3", group: 35 },
    // If you later confirm NAIA group ID, add it here:
    // { key: "NAIA", group: XX },
  ];

  async function fetchDivision(div) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=${div.group}&week=${week}&year=${year}`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.error(`Failed to fetch ${div.key} scoreboard`, resp.status);
        return [];
      }
      const data = await resp.json();
      const events = Array.isArray(data.events) ? data.events : [];
      const games = [];

      for (const event of events) {
        const comp = event.competitions?.[0];
        if (!comp) continue;

        const competitors = comp.competitors || [];
        const home = competitors.find(c => c.homeAway === "home") || competitors[0];
        const away = competitors.find(c => c.homeAway === "away") || competitors[1];

        const homeTeam =
          home?.team?.shortDisplayName ||
          home?.team?.displayName ||
          "Home";
        const awayTeam =
          away?.team?.shortDisplayName ||
          away?.team?.displayName ||
          "Away";

        // Parse date/time
        let dateObj;
        try {
          dateObj = event.date ? new Date(event.date) : null;
        } catch {
          dateObj = null;
        }

        const day = dateObj
          ? dateObj.toLocaleDateString("en-US", { weekday: "short" }) // e.g. Sat
          : "";

        const time = dateObj
          ? dateObj.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })
          : "TBA";

        // TV / network
        let tv = "";
        if (Array.isArray(comp.broadcasts) && comp.broadcasts.length > 0) {
          tv = comp.broadcasts[0].names?.[0] || "";
        }

        // Result (if completed)
        const homeScore =
          typeof home?.score === "string" ? parseInt(home.score, 10) : null;
        const awayScore =
          typeof away?.score === "string" ? parseInt(away.score, 10) : null;

        let resultText = "";
        if (homeScore !== null && awayScore !== null) {
          resultText = `${awayTeam} ${awayScore} @ ${homeTeam} ${homeScore}`;
        }

        const tvOrResult = resultText || tv || "";

        games.push({
          day,
          time,
          division: div.key,
          matchup: `${awayTeam} @ ${homeTeam}`,
          tvOrResult,
          sortKey: dateObj ? dateObj.toISOString() : `${day} ${time}`,
        });
      }

      return games;
    } catch (err) {
      console.error(`Error fetching ${div.key}:`, err);
      return [];
    }
  }

  try {
    const allDivisionGames = await Promise.all(
      DIVISIONS.map(div => fetchDivision(div))
    );

    let games = allDivisionGames.flat();

    // Sort by datetime
    games.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // Strip internal sortKey before sending
    games = games.map(({ sortKey, ...rest }) => rest);

    res.status(200).json({
      year,
      week,
      games,
    });
  } catch (err) {
    console.error("schedule API error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
