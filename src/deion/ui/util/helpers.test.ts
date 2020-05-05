import assert from "assert";
import helpers from "./helpers";

describe("ui/util/helpers", () => {
	describe("numberWithCommas", () => {
		test("work", () => {
			assert.equal(helpers.numberWithCommas(5823795234), "5,823,795,234");
			assert.equal(helpers.numberWithCommas(582.3795234), "582.3795234");
			assert.equal(helpers.numberWithCommas("5823795234"), "5,823,795,234");
			assert.equal(helpers.numberWithCommas("582.3795234"), "582.3795234");
			assert.equal(helpers.numberWithCommas(49.99), "49.99");
		});
	});

	describe("roundStat", () => {
		test("work", () => {
			assert.equal(helpers.roundStat(49.99, "fgp"), "50.0");
			assert.equal(helpers.roundStat(100, "fgp"), "100.0");
			assert.equal(helpers.roundStat(15.7, "trb"), "15.7");
			assert.equal(helpers.roundStat(15.7, "trb", true), "16");
		});
	});
});
