import {
	getPlayers,
	getTopPlayers,
} from "../../../../deion/worker/core/season/awards";
import { avScore } from "./doAwards";
import type { PlayerFiltered } from "../../../../deion/common/types";

const filterPosition = (season: number, positions: string[]) => (
	p: PlayerFiltered,
) => {
	let pr;
	for (let i = p.ratings.length - 1; i >= 0; i--) {
		if (p.ratings[i].season === season) {
			pr = p.ratings[i];
			break;
		}
	}

	if (!pr) {
		return false;
	}

	console.log(positions, pr.pos, positions.includes(pr.pos));

	return positions.includes(pr.pos);
};

const filterRoy = (season: number, positions: string[]) => (
	p: PlayerFiltered,
) => {
	if (p.draft.year !== season - 1) {
		return false;
	}

	return filterPosition(season, positions)(p);
};

const getAwardCandidates = async (season: number) => {
	const players = await getPlayers(season);

	const awardCandidates = [
		{
			name: "Most Valuable Player",
			players: getTopPlayers(
				{
					allowNone: true,
					amount: 10,
					score: avScore,
				},
				players,
			),
			stats: ["keyStats"],
		},
		{
			name: "Defensive Player of the Year",
			players: getTopPlayers(
				{
					allowNone: true,
					amount: 10,
					filter: filterPosition(season, ["DL", "LB", "S", "CB"]),
					score: avScore,
				},
				players,
			),
			stats: ["keyStats"],
		},
		{
			name: "Offensive Rookie of the Year",
			players: getTopPlayers(
				{
					allowNone: true,
					amount: 10,
					filter: filterRoy(season, ["QB", "RB", "WR", "TE", "OL"]),
					score: avScore,
				},
				players,
			),
			stats: ["keyStats"],
		},
		{
			name: "Defensive Rookie of the Year",
			players: getTopPlayers(
				{
					allowNone: true,
					amount: 10,
					filter: filterRoy(season, ["DL", "LB", "S", "CB"]),
					score: avScore,
				},
				players,
			),
			stats: ["keyStats"],
		},
	];

	return awardCandidates;
};

export default getAwardCandidates;
