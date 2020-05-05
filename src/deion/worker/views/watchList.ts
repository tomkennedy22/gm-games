import { PLAYER } from "../../common";
import { freeAgents } from "../core";
import { idb } from "../db";
import { g } from "../util";
import type { UpdateEvents, ViewInput } from "../../common/types";

const updatePlayers = async (
	inputs: ViewInput<"watchList">,
	updateEvents: UpdateEvents,
	state: any,
) => {
	if (
		updateEvents.includes("watchList") ||
		updateEvents.includes("gameSim") ||
		updateEvents.includes("playerMovement") ||
		inputs.statType !== state.statType ||
		inputs.playoffs !== state.playoffs
	) {
		const stats =
			process.env.SPORT === "basketball"
				? [
						"gp",
						"min",
						"fgp",
						"tpp",
						"ftp",
						"trb",
						"ast",
						"tov",
						"stl",
						"blk",
						"pts",
						"per",
						"ewa",
				  ]
				: ["gp", "keyStats", "av"];
		const playersAll = await idb.getCopies.players({
			// In Firefox, objects have a "watch" function
			filter: p => p.watch && typeof p.watch !== "function",
		});
		const players = await idb.getCopies.playersPlus(playersAll, {
			attrs: [
				"pid",
				"name",
				"age",
				"injury",
				"tid",
				"abbrev",
				"watch",
				"contract",
				"freeAgentMood",
				"draft",
			],
			ratings: ["ovr", "pot", "skills", "pos"],
			stats,
			season: g.get("season"),
			statType: inputs.statType,
			playoffs: inputs.playoffs === "playoffs",
			regularSeason: inputs.playoffs !== "playoffs",
			fuzz: true,
			showNoStats: true,
			showRookies: true,
			showRetired: true,
			oldStats: true,
		});

		// Add mood to free agent contracts
		for (let i = 0; i < players.length; i++) {
			if (players[i].tid === PLAYER.FREE_AGENT) {
				players[i].contract.amount = freeAgents.amountWithMood(
					players[i].contract.amount,
					players[i].freeAgentMood[g.get("userTid")],
				);
			}
		}

		return {
			players,
			playoffs: inputs.playoffs,
			statType: inputs.statType,
			stats,
		};
	}
};

export default updatePlayers;
