// /api/schedule.js

export default async function handler(req, res) {
  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  const week = parseInt(req.query.week, 10) || 1;

  const DIVISIONS = [
    { key: "FBS", group: 80 },
    { key: "FCS", group: 81 },
    { key: "D2/D3", group: 35 },
  ];

  function formatEasternTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "TBA";
    }
  }

  function getDayName(iso) {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        weekday: "short",
      });
    } catch {
      return "";
    }
  }

  async function fetchDivision(div) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=${div.group}&week=${week}&year=${year}`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) return [];
      const data = await resp.json();
      const events = data.events || [];

      const games = [];

      for (const event of events) {
        const comp = event.competitions?.[0];
        if (!comp) continue;

        const competitors = comp.competitors || [];
        const home = competitors.find(c => c.homeAway === "home");
        const away = competitors.find(c => c.homeAway === "away");

        // include rankings if available
        const formatTeam = t => {
          const rank = t?.curatedRank?.current;
          const name = t?.team?.shortDisplayName || t?.team?.displayName || "";
          return rank && rank > 0 ? `#${rank} ${name}` : name;
        };

        const homeTeam = formatTeam(home);
        const awayTeam = formatTeam(away);

        const isoDate = event.date;
        const day = getDayName(isoDate);
        const time = formatEasternTime(isoDate);

        // TV
        let tv = "";
        if (comp.broadcasts?.length > 0) {
          tv = comp.broadcasts[0].names?.[0] || "";
        }

        // Game status
        const statusType = event.status?.type?.completed;
        const homeScore = home?.score;
        const awayScore = away?.score;

        let tvOrResult = tv;
        if (statusType) {
          tvOrResult = `${awayTeam} ${awayScore} @ ${homeTeam} ${homeScore}`;
        }

        games.push({
          day,
          time,
          division: div.key,
          matchup: `${awayTeam} @ ${homeTeam}`,
          tvOrResult,
          sortKey: new Date(isoDate).getTime(),
        });
      }

      return games;
    } catch (err) {
      console.error("API error:", err);
      return [];
    }
  }

  try {
    const all = (await Promise.all(DIVISIONS.map(fetchDivision))).flat();

    all.sort((a, b) => a.sortKey - b.sortKey);

    res.status(200).json({
      year,
      week,
      games: all,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}
