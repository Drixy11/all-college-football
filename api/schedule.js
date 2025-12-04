const cheerio = require("cheerio");

module.exports = async function (req, res) {
  try {
    const { year, week } = req.query;

    if (!year || !week) {
      return res.status(400).json({ error: "Missing year or week" });
    }

    const DIVS = {
      fbs: 80,
      fcs: 81,
      d2: 50,
      d3: 55,
    };

    async function fetchDivision(divName, groupId) {
      const url = `https://www.espn.com/college-football/schedule/_/week/${week}/year/${year}/group/${groupId}`;

      const html = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      }).then((r) => r.text());

      const $ = cheerio.load(html);
      const games = [];

      $(".ScheduleTables .Table__TBODY .Table__TR").each((i, row) => {
        const cols = $(row).find(".Table__TD");

        if (cols.length < 3) return;

        const time = $(cols[0]).text().trim();

        /// teams
        const teams = $(cols[1]).find(".TeamLink");
        const away = $(teams[0]);
        const home = $(teams[1]);

        const awayTeam = away.text().trim();
        const homeTeam = home.text().trim();

        const awayLogo = away.find("img").attr("src") || null;
        const homeLogo = home.find("img").attr("src") || null;

        const tv = $(cols[2]).text().trim();
        const link = $(cols[1]).find("a").attr("href") || null;

        games.push({
          division: divName,
          time,
          tv,
          link: link ? `https://www.espn.com${link}` : null,
          away: {
            team: awayTeam,
            logo: awayLogo,
          },
          home: {
            team: homeTeam,
            logo: homeLogo,
          },
        });
      });

      return games;
    }

    const divisions = {};

    for (let div in DIVS) {
      divisions[div] = await fetchDivision(div, DIVS[div]);
    }

    return res.json({
      year,
      week,
      divisions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server crash", details: String(err) });
  }
};
