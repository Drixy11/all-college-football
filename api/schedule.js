import * as cheerio from "cheerio";

export default async function handler(req, res) {
    const year = req.query.year ?? 2025;
    const week = req.query.week ?? 1;

    const groups = {
        fbs: 80,   // ESPN FBS group
        fcs: 81,   // ESPN FCS group
        d2: 35,    // ESPN D2 group
        d3: 36,    // ESPN D3 group
        naia: 9    // NAIA (treated as “small colleges” on ESPN)
    };

    async function scrapeGroup(groupId) {
        const url = `https://www.espn.com/college-football/schedule/_/week/${week}/year/${year}/seasontype/2/group/${groupId}`;

        try {
            const html = await fetch(url).then(r => r.text());
            const $ = cheerio.load(html);

            const games = [];

            $("table tbody tr").each((i, el) => {
                const cols = $(el).find("td");

                if (cols.length < 3) return;

                let time = $(cols[0]).text().trim();
                let matchup = $(cols[1]).text().trim().replace(/\s+/g, " ");
                let tv = $(cols[2]).text().trim();

                games.push({
                    time,
                    matchup,
                    tv
                });
            });

            return games;

        } catch (err) {
            console.error("Scrape error for group:", groupId, err);
            return [];
        }
    }

    // Scrape all 5 divisions at once (fast!)
    const [fbs, fcs, d2, d3, naia] = await Promise.all([
        scrapeGroup(groups.fbs),
        scrapeGroup(groups.fcs),
        scrapeGroup(groups.d2),
        scrapeGroup(groups.d3),
        scrapeGroup(groups.naia)
    ]);

    return res.status(200).json({
        year,
        week,
        divisions: {
            fbs,
            fcs,
            d2,
            d3,
            naia
        }
    });
}
