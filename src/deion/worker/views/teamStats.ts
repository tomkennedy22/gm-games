import { idb } from "../db";
import { g, helpers, overrides } from "../util";
import type { UpdateEvents, ViewInput, TeamStatAttr } from "../../common/types";

const updateTeams = async (
	inputs: ViewInput<"teamStats">,
	updateEvents: UpdateEvents,
	state: any,
) => {
	if (
		(inputs.season === g.get("season") &&
			(updateEvents.includes("gameSim") ||
				updateEvents.includes("playerMovement"))) ||
		inputs.playoffs !== state.playoffs ||
		inputs.season !== state.season ||
		inputs.teamOpponent !== state.teamOpponent
	) {
		const statsTable =
			overrides.common.constants.TEAM_STATS_TABLES[inputs.teamOpponent];

		if (!statsTable) {
			throw new Error(`Invalid statType: "${inputs.teamOpponent}"`);
		}

		const stats = statsTable.stats;
		const seasonAttrs: ("won" | "lost" | "tied")[] = g.get("ties")
			? ["won", "lost", "tied"]
			: ["won", "lost"];
		const teams = (
			await idb.getCopies.teamsPlus({
				attrs: ["tid", "abbrev"],
				seasonAttrs,
				stats: ["gp", ...stats] as TeamStatAttr[],
				season: inputs.season,
				playoffs: inputs.playoffs === "playoffs",
				regularSeason: inputs.playoffs !== "playoffs",
			})
		).filter(t => {
			// For playoffs, only show teams who actually made playoffs (gp > 0)
			return inputs.playoffs !== "playoffs" || t.stats.gp > 0;
		});

		// For playoffs, fix W/L to be playoff W/L not regular season
		if (inputs.playoffs === "playoffs") {
			const playoffSeries = await idb.getCopy.playoffSeries({
				season: inputs.season,
			});

			if (playoffSeries !== undefined) {
				// Reset W/L
				for (const t of teams) {
					t.seasonAttrs.won = 0;
					t.seasonAttrs.lost = 0;
				}

				for (const round of playoffSeries.series) {
					for (const series of round) {
						for (const ah of ["away", "home"] as const) {
							const ha = ah === "away" ? "home" : "away";
							const t = teams.find(
								// https://github.com/microsoft/TypeScript/issues/21732
								// @ts-ignore
								t2 => series[ah] && t2.tid === series[ah].tid,
							);

							if (t && series[ah] && series[ha]) {
								// https://github.com/microsoft/TypeScript/issues/21732
								// @ts-ignore
								t.seasonAttrs.won += series[ah].won;
								// @ts-ignore
								t.seasonAttrs.lost += series[ha].won;
							}
						}
					}
				}
			}
		}

		// Sort stats so we can determine what percentile our team is in.
		const allStats: Record<string, number[]> = {};
		let statTypes: string[] = seasonAttrs.slice();

		for (const table of Object.values(
			overrides.common.constants.TEAM_STATS_TABLES,
		)) {
			statTypes = statTypes.concat(table.stats);
		}
		statTypes = Array.from(new Set(statTypes));

		const lowerIsBetter =
			process.env.SPORT === "basketball"
				? [
						"lost",
						"tov",
						"pf",
						"oppFg",
						"oppFga",
						"oppFgp",
						"oppTp",
						"oppTpa",
						"oppTpp",
						"oppFt",
						"oppFta",
						"oppFtp",
						"oppOrb",
						"oppDrb",
						"oppTrb",
						"oppAst",
						"oppStl",
						"oppBlk",
						"oppPts",
						"oppMov",
						"pl",
						"drtg",
						"oppFgAtRim",
						"oppFgaAtRim",
						"oppFgpAtRim",
						"oppFgLowPost",
						"oppFgaLowPost",
						"oppFgpLowPost",
						"oppFgMidRange",
						"oppFgaMidRange",
						"oppFgpMidRange",
				  ]
				: [
						"lost",
						"tov",
						"fmbLost",
						"pssInt",
						"pen",
						"penYds",
						"drivesTurnoverPct",
						"oppPts",
						"oppYds",
						"oppPly",
						"oppYdsPerPlay",
						"oppPssCmp",
						"oppPss",
						"oppPssYds",
						"oppPssTD",
						"oppPssNetYdsPerAtt",
						"oppRus",
						"oppRusYds",
						"oppRusTD",
						"oppRusYdsPerAtt",
						"oppDrives",
						"oppDrivesScoringPct",
						"oppAvgFieldPosition",
						"oppTimePerDrive",
						"oppPlaysPerDrive",
						"oppYdsPerDrive",
						"oppPtsPerDrive",
				  ];

		for (const t of teams) {
			for (const statType of statTypes) {
				const value = t.stats.hasOwnProperty(statType)
					? (t.stats as any)[statType]
					: (t.seasonAttrs as any)[statType];

				if (value === undefined) {
					continue;
				}

				if (!allStats[statType]) {
					allStats[statType] = [value];
				} else {
					allStats[statType].push(value);
				}
			}
		}

		// Sort stat types. "Better" values are at the start of the arrays.
		for (const statType of helpers.keys(allStats)) {
			allStats[statType].sort((a, b) => {
				// Sort lowest first.
				if (lowerIsBetter.includes(statType)) {
					if (a < b) {
						return -1;
					}

					if (a > b) {
						return 1;
					}

					return 0;
				}

				// Sort highest first.
				if (a < b) {
					return 1;
				}

				if (a > b) {
					return -1;
				}

				return 0;
			});
		}

		return {
			allStats,
			playoffs: inputs.playoffs,
			season: inputs.season,
			stats,
			superCols: statsTable.superCols,
			teamOpponent: inputs.teamOpponent,
			teams,
			ties: g.get("ties"),
			userTid: g.get("userTid"),
		};
	}
};

export default updateTeams;
