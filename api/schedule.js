import cheerio from "cheerio";

export default async function handler(req, res) {
  const { year, week } = req.query;

  if (!year || !week) {
    return res.status(400).json({ error: "Missing year or week" });
  }

  const divisions = {
    fbs: 80,
    fcs: 81,
    d2: 50,
    d3: 55,
  };

  async function scrapeDivision(divName, groupId) {
    const url = `https://www.espn.com/college-football/schedule/_/week/${week}/year/${year}/group/${groupId}`;

    const html = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }).then((r) => r.text());

    const $ = cheerio.load(html);
    const games = [];

    $("table tbody tr").each((i, row) => {
      const cells = $(row).find("td");
      if (cells.length < 3) return;

      const time = $(cells[0]).text().trim();
      const teamsCell = $(cells[1]);
      const tv = $(cells[2]).text().trim();

      const homeTeam = teamsCell.find(".home .team-name").text().trim();
      const awayTeam = teamsCell.find(".away .team-name").text().trim();
      const homeRank = teamsCell.find(".home .rank").text().trim() || null;
      const awayRank = teamsCell.find(".away .rank").text().trim() || null;
      const homeRecord = teamsCell.find(".home .record").text().trim() || null;
      const awayRecord = teamsCell.find(".away .record").text().trim() || null;

      const gameLink = teamsCell.find("a").attr("href") || null;

      // ESPN logos (fallback to svg icons if needed)
      const homeLogo =
        teamsCell.find(".home img").attr("src") ||
        teamsCell.find(".home img").attr("data-src") ||
        null;
      const awayLogo =
        teamsCell.find(".away img").attr("src") ||
        teamsCell.find(".away img").attr("data-src") ||
        null;

      games.push({
        division: divName,
        time,
        tv,
        link: gameLink ? `https://www.espn.com${gameLink}` : null,
        home: {
          team: homeTeam || "Home",
          logo: homeLogo,
          rank: homeRank,
          record: homeRecord,
        },
        away: {
          team: awayTeam || "Away",
          logo: awayLogo,
          rank: awayRank,
          record: awayRecord,
        },
        status: "scheduled",
      });
    });

    return games;
  }

  const result = {};

  for (const div in divisions) {
    result[div] = await scrapeDivision(div, divisions[div]);
  }

  res.status(200).json({
    year,
    week,
    divisions: result,
  });
}
