import { draft } from "..";
import { idb } from "../../db";
import { g } from "../../util";
import type { PhaseReturn } from "../../../common/types";

const newPhaseAfterDraft = async (): Promise<PhaseReturn> => {
	await draft.genPicks(g.get("season") + g.get("numSeasonsFutureDraftPicks"));

	// Delete any old draft picks
	const draftPicks = await idb.cache.draftPicks.getAll();
	for (const dp of draftPicks) {
		if (typeof dp.season !== "number" || dp.season <= g.get("season")) {
			await idb.cache.draftPicks.delete(dp.dpid);
		}
	}

	return [undefined, ["playerMovement"]];
};

export default newPhaseAfterDraft;
