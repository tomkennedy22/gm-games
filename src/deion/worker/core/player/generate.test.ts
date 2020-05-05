import assert from "assert";
import player from "./index";
import testHelpers from "../../../../deion/test/helpers";

describe("worker/core/player/generate", () => {
	test("create player with no stats", () => {
		testHelpers.resetG();
		const p = player.generate(-2, 19, 2012, false, 15.5);
		assert.equal(p.stats.length, 0);
	});
});
