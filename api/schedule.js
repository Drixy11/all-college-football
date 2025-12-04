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

  const final = {};

  try {
    for (const [name, group] of Object.entries(divisions)) {
      const url = `https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/events?week=${week}&season=${year}&groups=${group}`;

      const list = await fetch(url).then(r => r.json());

      if (!list?.items || !Array.isArray(list.items)) {
        final[name] = [];
        continue;
      }

      const games = [];

      for (const event of list.items) {
        const eventData = await fetch(event.$ref).then(r => r.json());

        const comp = eventData.competitions?.[0];
        if (!comp) continue;

        const competitors = comp.competitors || [];

        const home = competitors.find(c => c.homeAway === "home");
        const away = competitors.find(c => c.homeAway === "away");

        const homeTeam = home?.team?.displayName || "Home";
        const awayTeam = away?.team?.displayName || "Away";

        // matchup text
        const matchup = `@ ${homeTeam}`;

        // time formatting
        let time = "TBA";
        if (eventData.date) {
          time = new Date(eventData.date).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit"
          });
        }

        // TV network
        const tv = comp.broadcasts?.[0]?.names?.[0] || "";

        // scores (if available)
        const result = {
          homeTeam,
          awayTeam,
          homeScore: home?.score ?? null,
          awayScore: away?.score ?? null
        };

        games.push({
          time,
          matchup,
          tv,
          result
        });
      }

      // sort games by time
      games.sort((a, b) => new Date(`1/1/2000 ${a.time}`) - new Date(`1/1/2000 ${b.time}`));

      final[name] = games;
    }

    res.status(200).json({ week, divisions: final });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
