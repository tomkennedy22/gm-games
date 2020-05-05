import { PHASE } from "../../common";
import { g } from "../util";
import type { UpdateEvents, ViewInput } from "../../common/types";
import { getPlayers } from "./playerRatings";

const updatePlayers = async (
	inputs: ViewInput<"playerBios">,
	updateEvents: UpdateEvents,
	state: any,
) => {
	if (
		(inputs.season === g.get("season") &&
			(updateEvents.includes("gameSim") ||
				updateEvents.includes("playerMovement"))) ||
		(updateEvents.includes("newPhase") && g.get("phase") === PHASE.PRESEASON) ||
		inputs.season !== state.season ||
		inputs.abbrev !== state.abbrev
	) {
		const stats =
			process.env.SPORT === "basketball" ? ["pts", "trb", "ast"] : ["keyStats"];

		const players = await getPlayers(
			inputs.season,
			inputs.abbrev,
			["born", "college", "hgt", "weight", "draft"],
			["ovr", "pot"],
			stats,
		);

		return {
			abbrev: inputs.abbrev,
			currentSeason: g.get("season"),
			season: inputs.season,
			players,
			stats,
			userTid: g.get("userTid"),
		};
	}
};

export default updatePlayers;
