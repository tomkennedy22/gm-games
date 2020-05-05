import { player, team } from "..";
import cancel from "./cancel";
import { idb } from "../../db";
import { g, overrides, toUI, recomputeLocalUITeamOvrs } from "../../util";

/**
 * Accept the player's offer.
 *
 * If successful, then the team's current roster will be displayed.
 *
 * @memberOf core.contractNegotiation
 * @param {number} pid An integer that must correspond with the player ID of a player in an ongoing negotiation.
 * @return {Promise.<string=>} If an error occurs, resolves to a string error message.
 */
const accept = async (
	pid: number,
	amount: number,
	exp: number,
): Promise<string | undefined | null> => {
	const negotiation = await idb.cache.negotiations.get(pid);

	if (!negotiation) {
		return `No negotiation with player ${pid} found.`;
	}

	const payroll = await team.getPayroll(g.get("userTid"));
	const birdException = negotiation.resigning && !g.get("hardCap"); // If this contract brings team over the salary cap, it's not a minimum contract, and it's not re-signing a current
	// player with the Bird exception, ERROR!

	if (
		!birdException &&
		payroll + amount - 1 > g.get("salaryCap") &&
		amount - 1 > g.get("minContract")
	) {
		return `This contract would put you over the salary cap. You cannot go over the salary cap to sign ${
			g.get("hardCap") ? "players" : "free agents"
		} to contracts higher than the minimum salary.`;
	}

	// This error is for sanity checking in multi team mode. Need to check for existence of negotiation.tid because it
	// wasn't there originally and I didn't write upgrade code. Can safely get rid of it later.
	if (negotiation.tid !== undefined && negotiation.tid !== g.get("userTid")) {
		return `This negotiation was started by the ${
			g.get("teamRegionsCache")[negotiation.tid]
		} ${g.get("teamNamesCache")[negotiation.tid]} but you are the ${
			g.get("teamRegionsCache")[g.get("userTid")]
		} ${
			g.get("teamNamesCache")[g.get("userTid")]
		}. Either switch teams or cancel this negotiation.`;
	}

	const p = await idb.cache.players.get(pid);
	player.sign(
		p,
		g.get("userTid"),
		{
			amount,
			exp,
		},
		g.get("phase"),
	);
	await idb.cache.players.put(p);
	await cancel(pid);

	// If this a depth chart exists, place this player in the depth chart so they are ahead of every player they are
	// better than, without otherwise disturbing the depth chart order
	await overrides.core.team.rosterAutoSort!(g.get("userTid"), true);

	await toUI("realtimeUpdate", [["playerMovement"]]);
	await recomputeLocalUITeamOvrs();
};

export default accept;
