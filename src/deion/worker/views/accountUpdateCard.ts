import { ACCOUNT_API_URL, fetchWrapper } from "../../common";
import { checkAccount } from "../util";
import type { Conditions, UpdateEvents } from "../../common/types";

const updateAccountUpdateCard = async (
	inputs: unknown,
	updateEvents: UpdateEvents,
	state: unknown,
	conditions: Conditions,
) => {
	if (updateEvents.includes("firstRun") || updateEvents.includes("account")) {
		const partialTopMenu = await checkAccount(conditions);

		try {
			const data = await fetchWrapper({
				url: `${ACCOUNT_API_URL}/gold_card_info.php`,
				method: "GET",
				data: {
					sport: process.env.SPORT,
				},
				credentials: "include",
			});
			return {
				goldCancelled: partialTopMenu.goldCancelled,
				last4: data.last4,
				expMonth: data.expMonth,
				expYear: data.expYear,
				username: partialTopMenu.username,
			};
		} catch (err) {
			return {
				goldCancelled: partialTopMenu.goldCancelled,
				last4: "????",
				expMonth: "??",
				expYear: "????",
				username: partialTopMenu.username,
			};
		}
	}
};

export default updateAccountUpdateCard;
