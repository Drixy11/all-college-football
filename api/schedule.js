import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const year = req.query.year || "2025";
    const week = req.query.week || "1";

    // ESPN groups
    const GROUPS = {
      fbs: 80,
      fcs: 81,
      d2d3: 35,
    };

    async function scrapeDivision(divName, groupId) {
      const url = `https://www.espn.com/college-football/schedule/_/week/${week}/year/${year}/seasontype/2/group/${groupId}`;
      
      const html = await fetch(url).then(r => r.text());
      const $ = cheerio.load(html);

      const games = [];

      $("table tbody tr").each((_, row) => {
        const tds = $(row).find("td");
        if (tds.length < 3) return;

        const time = $(tds[0]).text().trim();
        const matchup = $(tds[1]).text().trim();

        games.push({
          time,
          matchup,
          div: divName,
        });
      });

      return games;
    }

    const [fbs, fcs, d2d3] = await Promise.all([
      scrapeDivision("FBS", GROUPS.fbs),
      scrapeDivision("FCS", GROUPS.fcs),
      scrapeDivision("D2/D3", GROUPS.d2d3)
    ]);

    res.status(200).json({
      year,
      week,
      divisions: {
        fbs,
        fcs,
        d2: d2d3,   // split if you want later
        d3: d2d3,   // same list for now (ESPN combines them)
      }
    });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Scrape failed", details: err.toString() });
  }
}
