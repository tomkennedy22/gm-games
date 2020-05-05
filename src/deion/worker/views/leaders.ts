import { PHASE, PLAYER } from "../../common";
import { idb } from "../db";
import { defaultGameAttributes, g, helpers } from "../util";
import type { UpdateEvents, ViewInput } from "../../common/types";

const getCategoriesAndStats = () => {
	const categories: {
		name: string;
		stat: string;
		statProp: string;
		title: string;
		data: any[];
		minStats: string[];
		minValue: number[];
	}[] =
		process.env.SPORT === "basketball"
			? [
					{
						name: "Points",
						stat: "PTS",
						statProp: "pts",
						title: "Points Per Game",
						data: [],
						minStats: ["gp", "pts"],
						minValue: [70, 1400],
					},
					{
						name: "Rebounds",
						stat: "TRB",
						statProp: "trb",
						title: "Rebounds Per Game",
						data: [],
						minStats: ["gp", "trb"],
						minValue: [70, 800],
					},
					{
						name: "Assists",
						stat: "AST",
						statProp: "ast",
						title: "Assists Per Game",
						data: [],
						minStats: ["gp", "ast"],
						minValue: [70, 400],
					},
					{
						name: "Field Goal Percentage",
						stat: "FG%",
						statProp: "fgp",
						title: "Field Goal Percentage",
						data: [],
						minStats: ["fg"],
						minValue: [300],
					},
					{
						name: "Three-Pointer Percentage",
						stat: "3PT%",
						statProp: "tpp",
						title: "Three-Pointer Percentage",
						data: [],
						minStats: ["tp"],
						minValue: [55],
					},
					{
						name: "Free Throw Percentage",
						stat: "FT%",
						statProp: "ftp",
						title: "Free Throw Percentage",
						data: [],
						minStats: ["ft"],
						minValue: [125],
					},
					{
						name: "Blocks",
						stat: "BLK",
						statProp: "blk",
						title: "Blocks Per Game",
						data: [],
						minStats: ["gp", "blk"],
						minValue: [70, 100],
					},
					{
						name: "Steals",
						stat: "STL",
						statProp: "stl",
						title: "Steals Per Game",
						data: [],
						minStats: ["gp", "stl"],
						minValue: [70, 125],
					},
					{
						name: "Minutes",
						stat: "MP",
						statProp: "min",
						title: "Minutes Per Game",
						data: [],
						minStats: ["gp", "min"],
						minValue: [70, 2000],
					},
					{
						name: "Player Efficiency Rating",
						stat: "PER",
						statProp: "per",
						title: "Player Efficiency Rating",
						data: [],
						minStats: ["min"],
						minValue: [2000],
					},
					{
						name: "Estimated Wins Added",
						stat: "EWA",
						statProp: "ewa",
						title: "Estimated Wins Added",
						data: [],
						minStats: ["min"],
						minValue: [2000],
					},
					{
						name: "Win Shares / 48 Mins",
						stat: "WS/48",
						statProp: "ws48",
						title: "Win Shares Per 48 Minutes",
						data: [],
						minStats: ["min"],
						minValue: [2000],
					},
					{
						name: "Offensive Win Shares",
						stat: "OWS",
						statProp: "ows",
						title: "Offensive Win Shares",
						data: [],
						minStats: ["min"],
						minValue: [2000],
					},
					{
						name: "Defensive Win Shares",
						stat: "DWS",
						statProp: "dws",
						title: "Defensive Win Shares",
						data: [],
						minStats: ["min"],
						minValue: [2000],
					},
					{
						name: "Win Shares",
						stat: "WS",
						statProp: "ws",
						title: "Win Shares",
						data: [],
						minStats: ["min"],
						minValue: [2000],
					},
			  ]
			: [
					{
						name: "Passing Yards",
						stat: "Yds",
						statProp: "pssYds",
						title: "Passing Yards",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Passing Yards Per Attempt",
						stat: "Y/A",
						statProp: "pssYdsPerAtt",
						title: "Passing Yards Per Attempt",
						data: [],
						minStats: ["pss"],
						minValue: [14 * 16],
					},
					{
						name: "Passing TDs",
						stat: "TD",
						statProp: "pssTD",
						title: "Passing Touchdowns",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Passing Interceptions",
						stat: "Int",
						statProp: "pssInt",
						title: "Passing Interceptions",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Quarterback Rating",
						stat: "QBRat",
						statProp: "qbRat",
						title: "Quarterback Rating",
						data: [],
						minStats: ["pss"],
						minValue: [14 * 16],
					},
					{
						name: "Rushing Yards",
						stat: "Yds",
						statProp: "rusYds",
						title: "Rushing Yards",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Rushing Yards Per Attempt",
						stat: "Y/A",
						statProp: "rusYdsPerAtt",
						title: "Rushing Yards Per Attempt",
						data: [],
						minStats: ["rus"],
						minValue: [6.25 * 16],
					},
					{
						name: "Rushing TDs",
						stat: "TD",
						statProp: "rusTD",
						title: "Rushing Touchdowns",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Receiving Yards",
						stat: "Yds",
						statProp: "recYds",
						title: "Receiving Yards",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Receiving Yards Per Attempt",
						stat: "Y/A",
						statProp: "recYdsPerAtt",
						title: "Receiving Yards Per Attempt",
						data: [],
						minStats: ["rec"],
						minValue: [1.875 * 16],
					},
					{
						name: "Receiving TDs",
						stat: "TD",
						statProp: "recTD",
						title: "Receiving Touchdowns",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Yards From Scrimmage",
						stat: "Yds",
						statProp: "ydsFromScrimmage",
						title: "Total Rushing and Receiving Yards From Scrimmage",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Rushing and Receiving TDs",
						stat: "TD",
						statProp: "rusRecTD",
						title: "Total Rushing and Receiving Touchdowns",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Tackles",
						stat: "Tck",
						statProp: "defTck",
						title: "Tackles",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Sacks",
						stat: "Sk",
						statProp: "defSk",
						title: "Sacks",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Defensive Interceptions",
						stat: "Int",
						statProp: "defInt",
						title: "Defensive Interceptions",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Forced Fumbles",
						stat: "FF",
						statProp: "defFmbFrc",
						title: "Forced Fumbles",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Fumbles Recovered",
						stat: "FR",
						statProp: "defFmbRec",
						title: "Fumbles Recovered",
						data: [],
						minStats: [],
						minValue: [],
					},
					{
						name: "Approximate Value",
						stat: "AV",
						statProp: "av",
						title: "Approximate Value",
						data: [],
						minStats: [],
						minValue: [],
					},
			  ];
	const statsSet = new Set<string>();

	for (const { minStats, statProp } of categories) {
		statsSet.add(statProp);

		for (const stat of minStats) {
			statsSet.add(stat);
		}
	}

	const stats = Array.from(statsSet);
	return {
		categories,
		stats,
	};
};

const updateLeaders = async (
	inputs: ViewInput<"leaders">,
	updateEvents: UpdateEvents,
	state: any,
) => {
	// Respond to watchList in case players are listed twice in different categories
	if (
		updateEvents.includes("watchList") ||
		(inputs.season === g.get("season") && updateEvents.includes("gameSim")) ||
		inputs.season !== state.season ||
		inputs.playoffs !== state.playoffs
	) {
		const { categories, stats } = getCategoriesAndStats(); // Calculate the number of games played for each team, which is used later to test if a player qualifies as a league leader

		const teamSeasons = await idb.getCopies.teamSeasons({
			season: inputs.season,
		});
		const gps = teamSeasons.map(teamSeason => {
			if (inputs.playoffs === "playoffs") {
				if (teamSeason.gp < g.get("numGames")) {
					return 0;
				}

				return teamSeason.gp - g.get("numGames");
			}

			// Don't count playoff games
			if (teamSeason.gp > g.get("numGames")) {
				return g.get("numGames");
			}

			return teamSeason.gp;
		});
		let players;

		if (g.get("season") === inputs.season && g.get("phase") <= PHASE.PLAYOFFS) {
			players = await idb.cache.players.indexGetAll("playersByTid", [
				PLAYER.FREE_AGENT,
				Infinity,
			]);
		} else {
			players = await idb.getCopies.players({
				activeSeason: inputs.season,
			});
		}

		players = await idb.getCopies.playersPlus(players, {
			attrs: ["pid", "nameAbbrev", "injury", "watch"],
			ratings: ["skills"],
			stats: ["abbrev", "tid", ...stats],
			season: inputs.season,
			playoffs: inputs.playoffs === "playoffs",
			regularSeason: inputs.playoffs !== "playoffs",
		});
		const userAbbrev = helpers.getAbbrev(g.get("userTid"));

		// minStats and minValues are the NBA requirements to be a league leader for each stat http://www.nba.com/leader_requirements.html. If any requirement is met, the player can appear in the league leaders
		const factor =
			(g.get("numGames") / defaultGameAttributes.numGames) *
			Math.sqrt(g.get("quarterLength") / defaultGameAttributes.quarterLength); // To handle changes in number of games and playing time

		for (const cat of categories) {
			players.sort((a, b) => b.stats[cat.statProp] - a.stats[cat.statProp]);

			for (const p of players) {
				// Test if the player meets the minimum statistical requirements for this category
				let pass = cat.minStats.length === 0;

				for (let k = 0; k < cat.minStats.length; k++) {
					// In basketball, everything except gp is a per-game average, so we need to scale them by games played
					let playerValue;

					if (process.env.SPORT === "football" || cat.minStats[k] === "gp") {
						playerValue = p.stats[cat.minStats[k]];
					} else {
						playerValue = p.stats[cat.minStats[k]] * p.stats.gp;
					}

					// Compare against value normalized for team games played
					if (
						playerValue >=
						Math.ceil(
							(cat.minValue[k] * factor * gps[p.stats.tid]) / g.get("numGames"),
						)
					) {
						pass = true;
						break; // If one is true, don't need to check the others
					}
				}

				if (pass) {
					const leader = helpers.deepCopy(p);
					leader.stat = leader.stats[cat.statProp];
					leader.abbrev = leader.stats.abbrev;
					delete leader.stats;
					leader.userTeam = userAbbrev === leader.abbrev;
					cat.data.push(leader);
				}

				// Stop when we found 10
				if (cat.data.length === 10) {
					break;
				}
			}

			delete cat.minStats;

			delete cat.minValue;
		}

		return {
			categories,
			playoffs: inputs.playoffs,
			season: inputs.season,
		};
	}
};

export default updateLeaders;
