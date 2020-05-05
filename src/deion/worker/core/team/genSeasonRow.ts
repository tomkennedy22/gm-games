import { g, random } from "../../util";
import type { TeamSeasonWithoutKey } from "../../../common/types";

const genSeasonRow = (
	tid: number,
	prevSeason?: TeamSeasonWithoutKey,
): TeamSeasonWithoutKey => {
	const defaultRank = (g.get("numTeams") + 1) / 2;
	const newSeason = {
		tid,
		season: g.get("season"),
		gp: 0,
		gpHome: 0,
		att: 0,
		cash: 10000,
		won: 0,
		lost: 0,
		tied: 0,
		wonHome: 0,
		lostHome: 0,
		tiedHome: 0,
		wonAway: 0,
		lostAway: 0,
		tiedAway: 0,
		wonDiv: 0,
		lostDiv: 0,
		tiedDiv: 0,
		wonConf: 0,
		lostConf: 0,
		tiedConf: 0,
		lastTen: [],
		streak: 0,
		playoffRoundsWon: -1,
		// -1: didn't make playoffs. 0: lost in first round. ... N: won championship
		hype: Math.random(),
		pop: 0,
		// Needs to be set somewhere!
		stadiumCapacity: g.get("defaultStadiumCapacity"),
		revenues: {
			luxuryTaxShare: {
				amount: 0,
				rank: defaultRank,
			},
			merch: {
				amount: 0,
				rank: defaultRank,
			},
			sponsor: {
				amount: 0,
				rank: defaultRank,
			},
			ticket: {
				amount: 0,
				rank: defaultRank,
			},
			nationalTv: {
				amount: 0,
				rank: defaultRank,
			},
			localTv: {
				amount: 0,
				rank: defaultRank,
			},
		},
		expenses: {
			salary: {
				amount: 0,
				rank: defaultRank,
			},
			luxuryTax: {
				amount: 0,
				rank: defaultRank,
			},
			minTax: {
				amount: 0,
				rank: defaultRank,
			},
			scouting: {
				amount: 0,
				rank: defaultRank,
			},
			coaching: {
				amount: 0,
				rank: defaultRank,
			},
			health: {
				amount: 0,
				rank: defaultRank,
			},
			facilities: {
				amount: 0,
				rank: defaultRank,
			},
		},
		payrollEndOfSeason: -1,
		ownerMood: {
			wins: 0,
			playoffs: 0,
			money: 0,
		},
	};

	if (prevSeason) {
		// New season, carrying over some values from the previous season
		newSeason.pop = prevSeason.pop * random.uniform(0.98, 1.02); // Mean population should stay constant, otherwise the economics change too much

		newSeason.stadiumCapacity = prevSeason.stadiumCapacity;
		newSeason.hype = prevSeason.hype;
		newSeason.cash = prevSeason.cash;

		if (g.get("userTid") === tid) {
			if (prevSeason.ownerMood) {
				newSeason.ownerMood = prevSeason.ownerMood;
			} else if ((g as any).ownerMood) {
				newSeason.ownerMood = (g as any).ownerMood;
			}
		}
	}

	return newSeason;
};

export default genSeasonRow;
