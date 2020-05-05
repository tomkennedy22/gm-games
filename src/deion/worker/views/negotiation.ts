import { PHASE } from "../../common";
import { contractNegotiation, freeAgents, team } from "../core";
import { idb } from "../db";
import { g } from "../util";
import type { ViewInput, PlayerContract } from "../../common/types";

const generateContractOptions = (contract: PlayerContract, ovr: number) => {
	let growthFactor = 0.15;

	// Modulate contract amounts based on last digit of ovr (add some deterministic noise)
	growthFactor += (ovr % 10) * 0.01 - 0.05;
	let exp = g.get("season");

	if (g.get("phase") > PHASE.AFTER_TRADE_DEADLINE) {
		exp += 1;
	}

	const contractOptions: {
		exp: number;
		years: number;
		amount: number;
		smallestAmount: boolean;
	}[] = [];
	let found: number | undefined;

	for (let i = 0; i < 5; i++) {
		contractOptions[i] = {
			exp: exp + i,
			years: 1 + i,
			amount: 0,
			smallestAmount: false,
		};

		if (contractOptions[i].exp === contract.exp) {
			contractOptions[i].amount = contract.amount;
			contractOptions[i].smallestAmount = true;
			found = i;
		}
	}

	if (found === undefined) {
		contractOptions[0].amount = contract.amount;
		contractOptions[0].smallestAmount = true;
		found = 0;
	}

	// From the desired contract, ask for more money for less or more years
	for (let i = 0; i < 5; i++) {
		const factor = 1 + Math.abs(found - i) * growthFactor;
		contractOptions[i].amount = contractOptions[found].amount * factor;
		contractOptions[i].amount =
			0.05 * Math.round(contractOptions[i].amount / 0.05); // Make it a multiple of 50k
	}

	return contractOptions.filter(
		contractOption => contractOption.amount * 1000 <= g.get("maxContract"),
	);
};

const updateNegotiation = async (inputs: ViewInput<"negotiation">) => {
	const negotiations = await idb.cache.negotiations.getAll();
	let negotiation;

	if (inputs.pid === undefined) {
		negotiation = negotiations[0];
	} else {
		negotiation = negotiations.find(neg => neg.pid === inputs.pid);
	}

	if (!negotiation) {
		// https://stackoverflow.com/a/59923262/786644
		const returnValue = {
			errorMessage: "No negotiation with player in progress.",
		};
		return returnValue;
	}

	const p2 = await idb.cache.players.get(negotiation.pid);
	const p = await idb.getCopy.playersPlus(p2, {
		attrs: ["pid", "name", "age", "contract", "freeAgentMood"],
		ratings: ["ovr", "pot"],
		season: g.get("season"),
		showNoStats: true,
		showRookies: true,
		fuzz: true,
	});

	// This can happen if a negotiation is somehow started with a retired player
	if (!p) {
		contractNegotiation.cancel(negotiation.pid);
		// https://stackoverflow.com/a/59923262/786644
		const returnValue = {
			errorMessage: "Invalid negotiation. Please try again.",
		};
		return returnValue;
	}

	p.contract.amount = freeAgents.amountWithMood(
		p.contract.amount,
		p.freeAgentMood[g.get("userTid")],
	);

	// Generate contract options
	const contractOptions = generateContractOptions(p.contract, p.ratings.ovr);
	const payroll = await team.getPayroll(g.get("userTid"));
	return {
		contractOptions,
		hardCap: g.get("hardCap"),
		payroll: payroll / 1000,
		player: p,
		resigning: negotiation.resigning,
		salaryCap: g.get("salaryCap") / 1000,
		userTid: g.get("userTid"),
	};
};

export default updateNegotiation;
