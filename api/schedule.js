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
      const url =
        `https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/events?week=${week}&season=${year}&groups=${group}`;

      const eventList = await fetch(url).then(r => r.json());

      if (!eventList?.items || eventList.items.length === 0) {
        results[name] = [];
        continue;
      }

      const games = [];

      for (const item of eventList.items) {
        const eventData = await fetch(item.$ref).then(r => r.json());

        const comp = eventData.competitions?.[0];
        if (!comp) continue;

        const competitors = comp.competitors || [];
        const home = competitors.find(c => c.homeAway === "home");
        const away = competitors.find(c => c.homeAway === "away");

        const homeTeam = home?.team?.displayName || "";
        const awayTeam = away?.team?.displayName || "";

        const matchup = `@ ${homeTeam}`;

        // Game time
        let time = "TBA";
        if (eventData.date) {
          time = new Date(eventData.date).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit"
          });
        }

        // Completed games → show score
        let result = "";
        if (home?.score && away?.score) {
          result = `${homeTeam} ${home.score}, ${awayTeam} ${away.score}`;
        }

        const tv = comp.broadcasts?.[0]?.names?.[0] || "";

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
    res.status(500).json({ error: err.toString() });
  }
}
