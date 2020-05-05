import assert from "assert";
import getDepthPlayers from "./getDepthPlayers";
import { helpers } from "../../../../deion/common";

describe("football/worker/core/player/getDepthPlayers", () => {
	beforeAll(() => {
		process.env.SPORT = "football";
	});

	test("works", () => {
		const depth = {
			QB: [1, 2, 3],
			RB: [1],
			WR: [1, 2, 3, 4, 5],
			TE: [1, 2],
			OL: [2, 3],
			DL: [1, 2, 3, 4, 5],
			LB: [1, 3],
			CB: [3, 2, 1],
			S: [1, 2, 3, 4, 5],
			K: [2],
			P: [3],
			KR: [1, 2, 3, 4],
			PR: [3, 2],
		};
		const players = [1, 2, 3].map(pid => {
			return {
				pid,
			};
		});
		const output = getDepthPlayers(depth, players);
		const target = {
			QB: [1, 2, 3],
			RB: [1, 2, 3],
			WR: [1, 2, 3],
			TE: [1, 2, 3],
			OL: [2, 3, 1],
			DL: [1, 2, 3],
			LB: [1, 3, 2],
			CB: [3, 2, 1],
			S: [1, 2, 3],
			K: [2, 1, 3],
			P: [3, 1, 2],
			KR: [1, 2, 3],
			PR: [3, 2, 1],
		};
		assert.deepEqual(Object.keys(output).sort(), Object.keys(target).sort());

		for (const pos of helpers.keys(output)) {
			assert.deepEqual(
				output[pos].map(p => p.pid),
				target[pos],
			);
		}
	});
});
