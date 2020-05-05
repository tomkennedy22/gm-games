import assert from "assert";
import { helpers } from ".";

describe("common/helpers", () => {
	describe("getTeamsDefault", () => {
		test("return correct length array", () => {
			assert.equal(helpers.getTeamsDefault().length, 30);
		});
	});
	describe("deepCopy", () => {
		const obj = {
			a: 5,
			b: "hi",
			c: [1, 2, 3],
		};

		test("return same object as input", () => {
			assert.deepEqual(helpers.deepCopy(obj), obj);
		});

		test("don't let changes in output propagate to input", () => {
			const obj2 = helpers.deepCopy(obj);
			obj2.a = 2;
			assert.notDeepEqual(helpers.deepCopy(obj), obj2);
		});

		test("don't let changes in input propagate to output", () => {
			const obj2 = helpers.deepCopy(obj);
			obj.a = 2;
			assert.notDeepEqual(helpers.deepCopy(obj), obj2);
		});
	});
	describe("formatCurrency", () => {
		test("work with no extra options", () => {
			assert.equal(helpers.formatCurrency(52.766), "$52.77");
		});

		test("append a string, if supplied", () => {
			assert.equal(helpers.formatCurrency(64363.764376, "Q"), "$64363.76Q");
			assert.equal(helpers.formatCurrency(0.794, "whatever"), "$0.79whatever");
		});

		test("round to any precision", () => {
			assert.equal(
				helpers.formatCurrency(64363.764376, "Q", 5),
				"$64363.76438Q",
			);
			assert.equal(helpers.formatCurrency(0.794, "whatever", 0), "$1whatever");
		});
	});
});
