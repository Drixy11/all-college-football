import cheerio from "cheerio";

const GROUPS = {
  fbs: 80,
  fcs: 81,
  d2: 36,
  d3: 35,
  naia: 34
};

async function scrapeGroup(year, week, groupId) {
  const url = `https://www.espn.com/college-football/schedule/_/week/${week}/year/${year}/seasontype/2/group/${groupId}`;
  
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const games = [];

  $("table tbody tr").each((i, row) => {
    const cols = $(row).find("td");
    const time = $(cols[0]).text().trim();
    const matchup = $(cols[1]).text().trim();
    const tv = $(cols[2]).text().trim();

    if (!matchup) return;

    games.push({
      time,
      matchup,
      tv
    });
  });

  return games;
}

export default async function handler(req, res) {
  try {
    const year = Number(req.query.year) || 2025;
    const week = Number(req.query.week) || 1;

    const divisions = {};

    for (const key in GROUPS) {
      divisions[key] = await scrapeGroup(year, week, GROUPS[key]);
    }

    return res.status(200).json({
      year,
      week,
      divisions
    });

  } catch (err) {
    console.error("SCHEDULE API ERROR:", err);
    return res.status(500).json({ error: err.toString() });
  }
}
