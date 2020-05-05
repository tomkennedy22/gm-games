import { PHASE } from "../../../common";
import { idb } from "../../db";
import { g, helpers, logEvent, overrides } from "../../util";
import type {
	Conditions,
	GamePlayer,
	GameResults,
} from "../../../common/types";

const checkStatisticalFeat = (
	pid: number,
	tid: number,
	p: GamePlayer,
	results: GameResults,
	conditions: Conditions,
) => {
	const logFeat = async (text: string) => {
		let allStars;

		if (tid < 0 && results.team[0].id === -1 && results.team[1].id === -2) {
			allStars = await idb.cache.allStars.get(g.get("season"));
		}

		let actualTid = tid;

		if (allStars) {
			// Fix team ID to actual team, not All-Star team
			const indTeam = tid === results.team[0].id ? 0 : 1;
			const entry = allStars.teams[indTeam].find(p2 => p2.pid === pid);

			if (entry) {
				actualTid = entry.tid;
			}
		}

		logEvent(
			{
				type: "playerFeat",
				text,
				showNotification: actualTid === g.get("userTid"),
				pids: [pid],
				tids: [actualTid],
			},
			conditions,
		);
	};

	const feat = overrides.core.player.checkStatisticalFeat!(p);
	const allStarGame = results.team[0].id === -1 && results.team[1].id === -2;

	if (feat) {
		const [i, j] = results.team[0].id === tid ? [0, 1] : [1, 0];
		const won = results.team[i].stat.pts > results.team[j].stat.pts;
		const featTextArr = Object.keys(feat).map(stat => `${feat[stat]} ${stat}`);
		let featText = `<a href="${helpers.leagueUrl(["player", pid])}">${
			p.name
		}</a> had <a href="${helpers.leagueUrl([
			"game_log",
			tid < 0 ? "special" : g.get("teamAbbrevsCache")[tid],
			g.get("season"),
			results.gid,
		])}">`;

		for (let k = 0; k < featTextArr.length; k++) {
			if (featTextArr.length > 1 && k === featTextArr.length - 1) {
				featText += " and ";
			}

			featText += featTextArr[k];

			if (featTextArr.length > 2 && k < featTextArr.length - 2) {
				featText += ", ";
			}
		}

		const endPart = allStarGame
			? `${won ? "win" : "loss"} in the All-Star Game`
			: `${won ? "win over the" : "loss to the"} ${
					g.get("teamNamesCache")[results.team[j].id]
			  }`;
		featText += `</a> in ${
			results.team[i].stat.pts.toString().charAt(0) === "8" ? "an" : "a"
		} ${results.team[i].stat.pts}-${results.team[j].stat.pts} ${endPart}.`;
		logFeat(featText);
		idb.cache.playerFeats.add({
			pid,
			name: p.name,
			pos: p.pos,
			season: g.get("season"),
			tid,
			oppTid: results.team[j].id,
			playoffs: g.get("phase") === PHASE.PLAYOFFS,
			gid: results.gid,
			stats: p.stat,
			won,
			score: `${results.team[i].stat.pts}-${results.team[j].stat.pts}`,
			overtimes: results.overtimes,
		});
	}
};

export default checkStatisticalFeat;
