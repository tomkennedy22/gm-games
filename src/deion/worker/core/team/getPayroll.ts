import { idb } from "../../db";
import type { ContractInfo } from "../../../common/types";

/**
 * Get the total current payroll for a team.
 *
 * This includes players who have been released but are still owed money from their old contracts.
 *
 * @memberOf core.team
 * @param {number | ContractInfo[]} tid Team ID, or a list of contracts from getContracts.
 * @return {Promise.<number>} Resolves to payroll in thousands of dollars.
 */
const getPayroll = async (input: number | ContractInfo[]): Promise<number> => {
	let payroll = 0;

	if (typeof input === "number") {
		const tid = input;
		const players = await idb.cache.players.indexGetAll("playersByTid", tid);
		for (const p of players) {
			payroll += p.contract.amount;
		}

		const releasedPlayers = await idb.cache.releasedPlayers.indexGetAll(
			"releasedPlayersByTid",
			tid,
		);
		for (const p of releasedPlayers) {
			payroll += p.contract.amount;
		}
	} else {
		const contracts = input;
		for (let i = 0; i < contracts.length; i++) {
			payroll += contracts[i].amount;
		}
	}

	return payroll;
};

export default getPayroll;
