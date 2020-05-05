import range from "lodash/range";
import { idb } from "../db";
import { g, helpers } from "../util";
import type {
	UpdateEvents,
	ViewInput,
	AllStars,
	TeamFiltered,
} from "../../common/types";

const getTeamRecord = (
	t: TeamFiltered<
		["tid", "cid", "did", "abbrev", "region", "name"],
		["season", "playoffRoundsWon", "won", "lost"],
		undefined,
		undefined
	>,
	awards: any[],
) => {
	let totalWon = 0;
	let totalLost = 0;
	let playoffAppearances = 0;
	let championships = 0;
	let finals = 0;
	let lastPlayoffAppearance: number | null = null;
	let lastChampionship: number | null = null;

	for (let i = 0; i < t.seasonAttrs.length; i++) {
		totalWon += t.seasonAttrs[i].won;
		totalLost += t.seasonAttrs[i].lost;

		if (t.seasonAttrs[i].playoffRoundsWon >= 0) {
			playoffAppearances++;
			lastPlayoffAppearance = t.seasonAttrs[i].season;
		}

		if (
			t.seasonAttrs[i].playoffRoundsWon >=
			g.get("numGamesPlayoffSeries").length - 1
		) {
			finals++;
		}

		if (
			t.seasonAttrs[i].playoffRoundsWon ===
			g.get("numGamesPlayoffSeries").length
		) {
			championships++;
			lastChampionship = t.seasonAttrs[i].season;
		}
	}

	const winp = helpers.roundWinp(
		totalWon > 0 ? totalWon / (totalWon + totalLost) : 0,
	);
	return {
		id: t.tid,
		team: {
			abbrev: t.abbrev,
			name: t.name,
			region: t.region,
		},
		cid: t.cid,
		did: t.did,
		won: totalWon,
		lost: totalLost,
		winp,
		playoffAppearances,
		lastPlayoffAppearance,
		championships,
		lastChampionship,
		finals,
		mvp: awards[t.tid] ? awards[t.tid].mvp : 0,
		dpoy: awards[t.tid] ? awards[t.tid].dpoy : 0,
		smoy: awards[t.tid] ? awards[t.tid].smoy : 0,
		mip: awards[t.tid] ? awards[t.tid].mip : 0,
		roy: awards[t.tid] ? awards[t.tid].roy : 0,
		oroy: awards[t.tid] ? awards[t.tid].oroy : 0,
		droy: awards[t.tid] ? awards[t.tid].droy : 0,
		bestRecord: awards[t.tid] ? awards[t.tid].bestRecord : 0,
		bestRecordConf: awards[t.tid] ? awards[t.tid].bestRecordConf : 0,
		allRookie: awards[t.tid] ? awards[t.tid].allRookie : 0,
		allLeague: awards[t.tid] ? awards[t.tid].allLeagueTotal : 0,
		allDefense: awards[t.tid] ? awards[t.tid].allDefenseTotal : 0,
		allStar: awards[t.tid] ? awards[t.tid].allStar : 0,
		allStarMVP: awards[t.tid] ? awards[t.tid].allStarMVP : 0,
	};
};

const tallyAwards = (awards: any[], allAllStars: AllStars[]) => {
	const teams = range(g.get("numTeams")).map(() => {
		return {
			mvp: 0,
			dpoy: 0,
			smoy: 0,
			mip: 0,
			roy: 0,
			oroy: 0,
			droy: 0,
			allLeague: [0, 0, 0],
			allLeagueTotal: 0,
			allDefense: [0, 0, 0],
			allDefenseTotal: 0,
			allRookie: 0,
			allStar: 0,
			allStarMVP: 0,
			bestRecord: 0,
			bestRecordConf: 0,
		};
	});

	for (const a of awards) {
		if (!a) {
			continue;
		}

		if (teams[a.mvp.tid]) {
			teams[a.mvp.tid].mvp++;
		}

		if (teams[a.dpoy.tid]) {
			teams[a.dpoy.tid].dpoy++;
		}

		if (a.smoy && teams[a.smoy.tid]) {
			teams[a.smoy.tid].smoy++;
		}

		if (a.mip && teams[a.mip.tid]) {
			teams[a.mip.tid].mip++;
		}

		if (a.roy && teams[a.roy.tid]) {
			teams[a.roy.tid].roy++;
		}

		if (a.oroy && teams[a.oroy.tid]) {
			teams[a.oroy.tid].oroy++;
		}

		if (a.droy && teams[a.droy.tid]) {
			teams[a.droy.tid].droy++;
		}

		if (a.bre && a.brw) {
			// For old league files, this format is obsolete now
			if (teams[a.bre.tid]) {
				teams[a.bre.tid].bestRecordConf++;
			}

			if (teams[a.brw.tid]) {
				teams[a.brw.tid].bestRecordConf++;
			}

			if (a.bre.won >= a.brw.won) {
				if (teams[a.bre.tid]) {
					teams[a.bre.tid].bestRecord++;
				}
			} else {
				// eslint-disable-next-line no-lonely-if
				if (teams[a.brw.tid]) {
					teams[a.brw.tid].bestRecord++;
				}
			}
		} else {
			for (const t of a.bestRecordConfs) {
				if (teams[t.tid]) {
					teams[t.tid].bestRecordConf++;
				}
			}

			if (teams[a.bestRecord.tid]) {
				teams[a.bestRecord.tid].bestRecord++;
			}

			for (const t of a.allRookie) {
				if (t && teams[t.tid]) {
					teams[t.tid].allRookie++;
				}
			}
		}

		for (let i = 0; i < a.allLeague.length; i++) {
			for (const p of a.allLeague[i].players) {
				// https://www.reddit.com/r/BasketballGM/comments/6i80ph/weird_error_message_while_viewing_certain_pages/
				if (teams[p.tid]) {
					teams[p.tid].allLeague[i]++;
					teams[p.tid].allLeagueTotal++;
				}
			}
		}

		if (a.allDefensive) {
			for (let i = 0; i < a.allDefensive.length; i++) {
				for (const p of a.allDefensive[i].players) {
					// https://www.reddit.com/r/BasketballGM/comments/6i80ph/weird_error_message_while_viewing_certain_pages/
					if (teams[p.tid]) {
						teams[p.tid].allDefense[i]++;
						teams[p.tid].allDefenseTotal++;
					}
				}
			}
		}
	}

	for (const allStars of allAllStars) {
		for (const { tid } of [
			...allStars.remaining,
			...allStars.teams[0],
			...allStars.teams[1],
		]) {
			teams[tid].allStar += 1;
		}

		if (allStars.mvp) {
			teams[allStars.mvp.tid].allStarMVP += 1;
		}
	}

	return teams;
};

const sumRecordsFor = (
	group: "cid" | "did",
	id: number,
	name: string,
	records: ReturnType<typeof getTeamRecord>[],
) => {
	const except = [
		"id",
		"lastChampionship",
		"lastPlayoffAppearance",
		"team",
		"cid",
		"did",
		"winp",
	];
	const keys = helpers.keys(records[0]);
	const out: any = {};
	const xRecords = records.filter(r => r[group] === id);

	for (const k of keys) {
		if (except.includes(k)) {
			out[k] = null;
		} else {
			out[k] = xRecords.reduce((a, b) => a + Number(b[k]), 0);
		}
	}

	out.id = id;
	out.team = name;
	out.winp = helpers.roundWinp(helpers.calcWinp(out));

	for (const key of ["lastChampionship", "lastPlayoffAppearance"] as const) {
		const years = xRecords
			.map(r => r[key])
			.filter(year => typeof year === "number") as number[];
		out[key] = years.length === 0 ? null : Math.max(...years);
	}

	return out;
};

const updateTeamRecords = async (
	inputs: ViewInput<"teamRecords">,
	updateEvents: UpdateEvents,
	state: any,
) => {
	if (updateEvents.includes("firstRun") || inputs.byType !== state.byType) {
		const teams = await idb.getCopies.teamsPlus({
			attrs: ["tid", "cid", "did", "abbrev", "region", "name"],
			seasonAttrs: ["season", "playoffRoundsWon", "won", "lost"],
		});
		const awards = await idb.getCopies.awards();
		const allStars = await idb.getCopies.allStars();

		const awardsPerTeam = tallyAwards(awards, allStars);
		const teamRecords = teams.map(t => getTeamRecord(t, awardsPerTeam));

		const seasonCount = teamRecords
			.map(tr => tr.championships)
			.reduce((a, b) => Number(a) + Number(b));
		let display;

		if (inputs.byType === "by_team") {
			display = teamRecords;
		} else if (inputs.byType === "by_conf") {
			display = g
				.get("confs")
				.map(conf => sumRecordsFor("cid", conf.cid, conf.name, teamRecords));
		} else {
			display = g
				.get("divs")
				.map(div => sumRecordsFor("did", div.did, div.name, teamRecords));
		}

		const categories =
			process.env.SPORT === "basketball"
				? [
						"mvp",
						"dpoy",
						"smoy",
						"mip",
						"roy",
						"bestRecord",
						"bestRecordConf",
						"allRookie",
						"allLeague",
						"allDefense",
						"allStar",
						"allStarMVP",
				  ]
				: [
						"mvp",
						"dpoy",
						"oroy",
						"droy",
						"bestRecord",
						"bestRecordConf",
						"allRookie",
						"allLeague",
				  ];
		return {
			byType: inputs.byType,
			categories,
			seasonCount,
			teamRecords: display,
		};
	}
};

export default updateTeamRecords;
