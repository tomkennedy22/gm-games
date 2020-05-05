import { PHASE } from "../../common";
import { season, team } from "../core";
import { idb } from "../db";
import { g, overrides } from "../util";
import type {
	UpdateEvents,
	ViewInput,
	TeamSeasonAttr,
} from "../../common/types";

const footballScore = (p: {
	ratings: {
		pos: string;
		ovr: number;
	};
}) => {
	const ind = overrides.common.constants.POSITIONS.indexOf(p.ratings.pos);
	return (
		(overrides.common.constants.POSITIONS.length - ind) * 1000 + p.ratings.ovr
	);
};

const updateRoster = async (
	inputs: ViewInput<"roster">,
	updateEvents: UpdateEvents,
	state: any,
) => {
	if (
		updateEvents.includes("watchList") ||
		(inputs.season === g.get("season") &&
			(updateEvents.includes("gameSim") ||
				updateEvents.includes("playerMovement") ||
				updateEvents.includes("newPhase"))) ||
		inputs.abbrev !== state.abbrev ||
		inputs.season !== state.season
	) {
		const stats =
			process.env.SPORT === "basketball"
				? ["gp", "min", "pts", "trb", "ast", "per"]
				: ["gp", "keyStats", "av"];

		const editable =
			inputs.season === g.get("season") &&
			inputs.tid === g.get("userTid") &&
			process.env.SPORT === "basketball";

		const showRelease =
			inputs.season === g.get("season") && inputs.tid === g.get("userTid");

		const seasonAttrs: TeamSeasonAttr[] = [
			"profit",
			"won",
			"lost",
			"playoffRoundsWon",
		];
		if (g.get("ties")) {
			seasonAttrs.push("tied");
		}
		const t = await idb.getCopy.teamsPlus({
			season: inputs.season,
			tid: inputs.tid,
			attrs: ["tid", "region", "name", "strategy", "imgURL"],
			seasonAttrs,
			stats: ["pts", "oppPts", "gp"],
		});

		if (!t) {
			const returnValue = {
				errorMessage: "Invalid team ID.",
			};
			return returnValue;
		}

		const attrs = [
			"pid",
			"tid",
			"draft",
			"name",
			"age",
			"contract",
			"cashOwed",
			"rosterOrder",
			"injury",
			"ptModifier",
			"watch",
			"untradable",
			"hof",
			"latestTransaction",
		]; // tid and draft are used for checking if a player can be released without paying his salary

		const ratings = ["ovr", "pot", "dovr", "dpot", "skills", "pos"];
		const stats2 = [...stats, "yearsWithTeam"];

		let players: any[];
		let payroll: number | undefined;

		if (inputs.season === g.get("season")) {
			// Show players currently on the roster
			const [schedule, playersAll] = await Promise.all([
				season.getSchedule(),
				idb.cache.players.indexGetAll("playersByTid", inputs.tid),
			]);
			payroll = (await team.getPayroll(inputs.tid)) / 1000;

			// numGamesRemaining doesn't need to be calculated except for userTid, but it is.
			let numGamesRemaining = 0;

			for (let i = 0; i < schedule.length; i++) {
				if (
					inputs.tid === schedule[i].homeTid ||
					inputs.tid === schedule[i].awayTid
				) {
					numGamesRemaining += 1;
				}
			}

			players = await idb.getCopies.playersPlus(playersAll, {
				attrs,
				ratings,
				stats: stats2,
				season: inputs.season,
				tid: inputs.tid,
				showNoStats: true,
				showRookies: true,
				fuzz: true,
				numGamesRemaining,
			});

			if (process.env.SPORT === "basketball") {
				players.sort((a, b) => a.rosterOrder - b.rosterOrder);
			} else {
				players.sort((a, b) => footballScore(b) - footballScore(a));
			}

			for (let i = 0; i < players.length; i++) {
				// Can release from user's team, except in playoffs because then no free agents can be signed to meet the minimum roster requirement
				if (
					inputs.tid === g.get("userTid") &&
					(g.get("phase") !== PHASE.PLAYOFFS ||
						players.length > g.get("maxRosterSize")) &&
					!g.get("gameOver") &&
					players.length > 5
				) {
					players[i].canRelease = true;
				} else {
					players[i].canRelease = false;
				}

				// Convert ptModifier to string so it doesn't cause unneeded knockout re-rendering
				players[i].ptModifier = String(players[i].ptModifier);
			}
		} else {
			// Show all players with stats for the given team and year
			// Needs all seasons because of YWT!
			const playersAll = await idb.getCopies.players({
				statsTid: inputs.tid,
			});
			players = await idb.getCopies.playersPlus(playersAll, {
				attrs,
				ratings,
				stats: stats2,
				season: inputs.season,
				tid: inputs.tid,
				fuzz: true,
			});

			if (process.env.SPORT === "basketball") {
				players.sort(
					(a, b) => b.stats.gp * b.stats.min - a.stats.gp * a.stats.min,
				);
			} else {
				players.sort((a, b) => footballScore(b) - footballScore(a));
			}

			for (let i = 0; i < players.length; i++) {
				players[i].canRelease = false;
			}
		}

		const playersCurrent = players.filter(
			(p: any) => p.injury.gamesRemaining === 0,
		);
		const t2 = {
			...t,
			ovr: overrides.core.team.ovr!(players),
			ovrCurrent: overrides.core.team.ovr!(playersCurrent),
		};

		return {
			abbrev: inputs.abbrev,
			budget: g.get("budget"),
			currentSeason: g.get("season"),
			editable,
			maxRosterSize: g.get("maxRosterSize"),
			numConfs: g.get("confs").length,
			numPlayoffRounds: g.get("numGamesPlayoffSeries").length,
			payroll,
			phase: g.get("phase"),
			players,
			salaryCap: g.get("salaryCap") / 1000,
			season: inputs.season,
			showRelease,
			showTradeFor:
				inputs.season === g.get("season") && inputs.tid !== g.get("userTid"),
			stats,
			t: t2,
			userTid: g.get("userTid"),
		};
	}
};

export default updateRoster;
