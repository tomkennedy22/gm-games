import { allStar, finances, player } from "..";
import { idb } from "../../db";
import { g, overrides } from "../../util";

const processTeam = (team, teamSeason, teamStats, players, playerStats) => {
	const allStarGame = team.tid === -1 || team.tid === -2;

	if (!allStarGame) {
		players.sort((a, b) => a.rosterOrder - b.rosterOrder);
	}

	// Initialize team composite rating object
	const compositeRating: any = {};

	for (const rating of Object.keys(
		overrides.common.constants.COMPOSITE_WEIGHTS,
	)) {
		compositeRating[rating] = 0;
	}

	const t = {
		id: team.tid,
		pace: 0,
		won: teamSeason.won,
		lost: teamSeason.lost,
		cid: team.cid,
		did: team.did,
		stat: {},
		player: [],
		synergy: {
			off: 0,
			def: 0,
			reb: 0,
		},
		healthRank: finances.getRankLastThree([teamSeason], "expenses", "health"),
		compositeRating,
		depth: undefined,
	};

	for (const p of players) {
		const rating = p.ratings[p.ratings.length - 1];
		const playerCompositeRatings: any = {};
		const p2 = {
			id: p.pid,
			pid: p.pid,
			// for getDepthPlayers, eventually do it all this way
			name: `${p.firstName} ${p.lastName}`,
			age: g.season - p.born.year,
			pos: rating.pos,
			valueNoPot: p.valueNoPot,
			stat: {},
			compositeRating: playerCompositeRatings,
			skills: rating.skills,
			injury: p.injury,
			injured: p.injury.type !== "Healthy",
			ptModifier: p.ptModifier,
			ovrs: rating.ovrs,
		};

		// Reset ptModifier for AI teams. This should not be necessary since it should always be 1, but let's be safe.
		if (!g.userTids.includes(t.id)) {
			p2.ptModifier = 1;
		}

		// These use the same formulas as the skill definitions in player.skills!
		for (const k of Object.keys(overrides.common.constants.COMPOSITE_WEIGHTS)) {
			p2.compositeRating[k] = player.compositeRating(
				rating,
				overrides.common.constants.COMPOSITE_WEIGHTS[k].ratings,
				overrides.common.constants.COMPOSITE_WEIGHTS[k].weights,
				false,
			);
		}

		if (process.env.SPORT === "basketball") {
			// eslint-disable-next-line operator-assignment
			p2.compositeRating.usage = p2.compositeRating.usage ** 1.9;
		}

		p2.stat = {
			gs: 0,
			min: 0,
			...playerStats,
			courtTime: 0,
			benchTime: 0,
			energy: 1,
		};
		t.player.push(p2);
	}

	if (team.depth !== undefined) {
		if (!overrides.core.player.getDepthPlayers) {
			throw new Error("Missing overrides.core.player.getDepthPlayers");
		}

		t.depth = overrides.core.player.getDepthPlayers(team.depth, t.player);
	}

	for (const p of t.player) {
		delete p.pid;
	}

	// Number of players to factor into pace and defense rating calculation
	let numPlayers = t.player.length;

	if (numPlayers > 7) {
		numPlayers = 7;
	}

	// Would be better if these were scaled by average min played and endurancence
	t.pace = 0;

	for (let i = 0; i < numPlayers; i++) {
		t.pace += t.player[i].compositeRating.pace;
	}

	t.pace /= numPlayers;
	t.pace = t.pace * 15 + 100; // Scale between 100 and 115

	if (allStarGame) {
		t.pace *= 1.15;
	}

	t.stat = { ...teamStats, pts: 0, ptsQtrs: [0] };
	return t;
};

/**
 * Load the teams specified by tids into an object of team objects.
 *
 * The team objects contain all the information needed to simulate games. It would be more efficient if it only loaded team data for teams that are actually playing, particularly in the playoffs.
 *
 * @memberOf core.game
 * @param {IDBTransaction} ot An IndexedDB transaction on players and teams.
 * @param {Promise} Resolves to an array of team objects, ordered by tid.
 */
const loadTeams = async (tids: number[]) => {
	if (!overrides.core.player.stats) {
		throw new Error("Missing overrides.core.player.stats");
	}

	const playerStats = overrides.core.player.stats.raw.reduce((stats, stat) => {
		if (stat === "gp") {
			return stats;
		}

		stats[stat] = 0;
		return stats;
	}, {});

	if (!overrides.core.team.stats) {
		throw new Error("Missing overrides.core.team.stats");
	}

	const teamStats = overrides.core.team.stats.raw.reduce((stats, stat) => {
		stats[stat] = 0;
		return stats;
	}, {});
	const teams = {};

	if (tids.length === 2 && tids.includes(-1) && tids.includes(-2)) {
		// All-Star Game
		const allStars = await allStar.getOrCreate();

		if (!allStars.finalized) {
			await allStar.draftAll();
		}

		for (const tid of tids) {
			const allStarsTeamInd = tid === -1 ? 0 : 1;
			const players = await Promise.all(
				allStars.teams[allStarsTeamInd].map(async ({ pid }) => {
					const p = await idb.cache.players.get(pid);

					if (!p) {
						throw new Error(`Can't find player ${pid}`);
					}

					return p;
				}),
			);
			teams[tid] = processTeam(
				{
					tid,
					cid: -1,
					did: -1,
				},
				{
					won: 0,
					lost: 0,
					expenses: {
						health: {
							rank: 1,
						},
					},
				},
				teamStats,
				players,
				playerStats,
			);
		}
	} else {
		await Promise.all(
			tids.map(async tid => {
				const [players, team, teamSeason] = await Promise.all([
					idb.cache.players.indexGetAll("playersByTid", tid),
					idb.cache.teams.get(tid),
					idb.cache.teamSeasons.indexGet("teamSeasonsByTidSeason", [
						tid,
						g.season,
					]),
				]);
				teams[tid] = processTeam(
					team,
					teamSeason,
					teamStats,
					players,
					playerStats,
				);
			}),
		);
	}

	return teams;
};

export default loadTeams;
