import { idb } from "../db";
import { g, helpers } from "../util";
import type { UpdateEvents } from "../../common/types";

const updateUserRoster = async (
	inputs: unknown,
	updateEvents: UpdateEvents,
) => {
	if (
		updateEvents.includes("firstRun") ||
		updateEvents.includes("playerMovement") ||
		updateEvents.includes("gameSim")
	) {
		const stats =
			process.env.SPORT === "basketball"
				? ["min", "pts", "trb", "ast", "per"]
				: ["gp", "keyStats", "av"];
		const [userRosterAll, userPicks] = await Promise.all([
			idb.cache.players.indexGetAll("playersByTid", g.get("userTid")),
			await idb.getCopies.draftPicks({
				tid: g.get("userTid"),
			}),
		]);
		const userRoster = await idb.getCopies.playersPlus(userRosterAll, {
			attrs: [
				"pid",
				"name",
				"age",
				"contract",
				"injury",
				"watch",
				"untradable",
			],
			ratings: ["ovr", "pot", "skills", "pos"],
			stats,
			season: g.get("season"),
			tid: g.get("userTid"),
			showNoStats: true,
			showRookies: true,
			fuzz: true,
		});

		const userPicks2 = userPicks.map(dp => {
			return {
				...dp,
				desc: helpers.pickDesc(dp),
			};
		});

		return {
			gameOver: g.get("gameOver"),
			phase: g.get("phase"),
			stats,
			ties: g.get("ties"),
			userPicks: userPicks2,
			userRoster,
		};
	}
};

export default updateUserRoster;
