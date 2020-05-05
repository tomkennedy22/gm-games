import { idb } from "../../db";
import { g } from "../../util";
import draftOne from "./draftOne";

const draftAll = async (): Promise<number[]> => {
	const allStars = await idb.cache.allStars.get(g.get("season"));
	const pids: number[] = [];

	while (!allStars.finalized) {
		const { pid } = await draftOne();

		if (pid === undefined) {
			break;
		}

		pids.push(pid);
	}

	return pids;
};

export default draftAll;
