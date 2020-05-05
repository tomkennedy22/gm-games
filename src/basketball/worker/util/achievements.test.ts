import assert from "assert";
import testHelpers from "../../../deion/test/helpers";
import { player, team } from "../../../deion/worker/core";
import { idb } from "../../../deion/worker/db";
import { g, helpers } from "../../../deion/worker/util";
import achievements from "./achievements";

const get = (slug: string): any => {
	const achievement = achievements.find(
		achievement2 => slug === achievement2.slug,
	);
	if (!achievement) {
		throw new Error(`No achievement found for slug "${slug}"`);
	}
	return achievement;
};

describe("basketball/worker/util/account/checkAchievement", () => {
	beforeAll(async () => {
		testHelpers.resetG();
		g.setWithoutSavingToDB("season", 2013);
		g.setWithoutSavingToDB("userTid", 7);

		const teamsDefault = helpers.getTeamsDefault();
		await testHelpers.resetCache({
			players: [
				player.generate(0, 30, 2010, true, 15.5),
				player.generate(0, 30, 2010, true, 15.5),
			],
			teams: teamsDefault.map(team.generate),
			teamSeasons: teamsDefault.map(t => team.genSeasonRow(t.tid)),
		});

		idb.league = testHelpers.mockIDBLeague();
	});
	afterAll(() => {
		// @ts-ignore
		idb.league = undefined;
	});

	describe("fo_fo_fo", () => {
		test("award achievement for 16-0 playoff record for user's team", async () => {
			// tid 7 wins 4-0 every series
			const ps = {
				season: 2013,
				currentRound: 3,
				series: [
					[
						{
							home: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 16,
								cid: 0,
								winp: 0.47560975609756095,
								won: 0,
								seed: 8,
							},
						},
						{
							home: {
								tid: 1,
								cid: 0,
								winp: 0.6097560975609756,
								won: 4,
								seed: 4,
							},
							away: {
								tid: 15,
								cid: 0,
								winp: 0.5609756097560976,
								won: 1,
								seed: 5,
							},
						},
						{
							home: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 5,
								cid: 0,
								winp: 0.5609756097560976,
								won: 3,
								seed: 6,
							},
						},
						{
							home: {
								tid: 29,
								cid: 0,
								winp: 0.6951219512195121,
								won: 3,
								seed: 2,
							},
							away: {
								tid: 17,
								cid: 0,
								winp: 0.5121951219512195,
								won: 4,
								seed: 7,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 23,
								cid: 1,
								winp: 0.5365853658536586,
								won: 0,
								seed: 8,
							},
						},
						{
							home: {
								tid: 12,
								cid: 1,
								winp: 0.6829268292682927,
								won: 1,
								seed: 4,
							},
							away: {
								tid: 24,
								cid: 1,
								winp: 0.5853658536585366,
								won: 4,
								seed: 5,
							},
						},
						{
							home: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 14,
								cid: 1,
								winp: 0.5853658536585366,
								won: 0,
								seed: 6,
							},
						},
						{
							home: {
								tid: 6,
								cid: 1,
								winp: 0.7439024390243902,
								won: 4,
								seed: 2,
							},
							away: {
								tid: 18,
								cid: 1,
								winp: 0.5487804878048781,
								won: 3,
								seed: 7,
							},
						},
					],
					[
						{
							home: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 1,
								cid: 0,
								winp: 0.6097560975609756,
								won: 0,
								seed: 4,
							},
						},
						{
							home: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 17,
								cid: 0,
								winp: 0.5121951219512195,
								won: 1,
								seed: 7,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 24,
								cid: 1,
								winp: 0.5853658536585366,
								won: 3,
								seed: 5,
							},
						},
						{
							home: {
								tid: 6,
								cid: 1,
								winp: 0.7439024390243902,
								won: 1,
								seed: 2,
							},
							away: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 4,
								seed: 3,
							},
						},
					],
					[
						{
							home: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 0,
								seed: 3,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 2,
								seed: 3,
							},
						},
					],
					[
						{
							home: {
								tid: 4,
								cid: 1,
								winp: 0.8048780487804879,
								won: 0,
								seed: 1,
							},
							away: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
						},
					],
				],
			};

			await idb.cache.playoffSeries.put(ps);
			const awarded = await get("fo_fo_fo").check();
			assert.equal(awarded, true);
		});

		test("don't award achievement for 16-? playoff record for user's team", async () => {
			// tid 7 loses a game!
			const ps = {
				season: 2013,
				currentRound: 3,
				series: [
					[
						{
							home: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 16,
								cid: 0,
								winp: 0.47560975609756095,
								won: 0,
								seed: 8,
							},
						},
						{
							home: {
								tid: 1,
								cid: 0,
								winp: 0.6097560975609756,
								won: 4,
								seed: 4,
							},
							away: {
								tid: 15,
								cid: 0,
								winp: 0.5609756097560976,
								won: 1,
								seed: 5,
							},
						},
						{
							home: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 5,
								cid: 0,
								winp: 0.5609756097560976,
								won: 3,
								seed: 6,
							},
						},
						{
							home: {
								tid: 29,
								cid: 0,
								winp: 0.6951219512195121,
								won: 3,
								seed: 2,
							},
							away: {
								tid: 17,
								cid: 0,
								winp: 0.5121951219512195,
								won: 4,
								seed: 7,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 23,
								cid: 1,
								winp: 0.5365853658536586,
								won: 0,
								seed: 8,
							},
						},
						{
							home: {
								tid: 12,
								cid: 1,
								winp: 0.6829268292682927,
								won: 1,
								seed: 4,
							},
							away: {
								tid: 24,
								cid: 1,
								winp: 0.5853658536585366,
								won: 4,
								seed: 5,
							},
						},
						{
							home: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 14,
								cid: 1,
								winp: 0.5853658536585366,
								won: 0,
								seed: 6,
							},
						},
						{
							home: {
								tid: 6,
								cid: 1,
								winp: 0.7439024390243902,
								won: 4,
								seed: 2,
							},
							away: {
								tid: 18,
								cid: 1,
								winp: 0.5487804878048781,
								won: 3,
								seed: 7,
							},
						},
					],
					[
						{
							home: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 1,
								cid: 0,
								winp: 0.6097560975609756,
								won: 1,
								seed: 4,
							},
						},
						{
							home: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 17,
								cid: 0,
								winp: 0.5121951219512195,
								won: 1,
								seed: 7,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 24,
								cid: 1,
								winp: 0.5853658536585366,
								won: 3,
								seed: 5,
							},
						},
						{
							home: {
								tid: 6,
								cid: 1,
								winp: 0.7439024390243902,
								won: 1,
								seed: 2,
							},
							away: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 4,
								seed: 3,
							},
						},
					],
					[
						{
							home: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 0,
								seed: 3,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 2,
								seed: 3,
							},
						},
					],
					[
						{
							home: {
								tid: 4,
								cid: 1,
								winp: 0.8048780487804879,
								won: 0,
								seed: 1,
							},
							away: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
						},
					],
				],
			};

			await idb.cache.playoffSeries.put(ps);
			const awarded = await get("fo_fo_fo").check();
			assert.equal(awarded, false);
		});

		test("don't award achievement for 16-0 playoff record for other team", async () => {
			// tid 7 is changed to 8
			const ps = {
				season: 2013,
				currentRound: 3,
				series: [
					[
						{
							home: {
								tid: 8,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 16,
								cid: 0,
								winp: 0.47560975609756095,
								won: 0,
								seed: 8,
							},
						},
						{
							home: {
								tid: 1,
								cid: 0,
								winp: 0.6097560975609756,
								won: 4,
								seed: 4,
							},
							away: {
								tid: 15,
								cid: 0,
								winp: 0.5609756097560976,
								won: 1,
								seed: 5,
							},
						},
						{
							home: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 5,
								cid: 0,
								winp: 0.5609756097560976,
								won: 3,
								seed: 6,
							},
						},
						{
							home: {
								tid: 29,
								cid: 0,
								winp: 0.6951219512195121,
								won: 3,
								seed: 2,
							},
							away: {
								tid: 17,
								cid: 0,
								winp: 0.5121951219512195,
								won: 4,
								seed: 7,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 23,
								cid: 1,
								winp: 0.5365853658536586,
								won: 0,
								seed: 8,
							},
						},
						{
							home: {
								tid: 12,
								cid: 1,
								winp: 0.6829268292682927,
								won: 1,
								seed: 4,
							},
							away: {
								tid: 24,
								cid: 1,
								winp: 0.5853658536585366,
								won: 4,
								seed: 5,
							},
						},
						{
							home: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 14,
								cid: 1,
								winp: 0.5853658536585366,
								won: 0,
								seed: 6,
							},
						},
						{
							home: {
								tid: 6,
								cid: 1,
								winp: 0.7439024390243902,
								won: 4,
								seed: 2,
							},
							away: {
								tid: 18,
								cid: 1,
								winp: 0.5487804878048781,
								won: 3,
								seed: 7,
							},
						},
					],
					[
						{
							home: {
								tid: 8,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 1,
								cid: 0,
								winp: 0.6097560975609756,
								won: 1,
								seed: 4,
							},
						},
						{
							home: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 17,
								cid: 0,
								winp: 0.5121951219512195,
								won: 1,
								seed: 7,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 24,
								cid: 1,
								winp: 0.5853658536585366,
								won: 3,
								seed: 5,
							},
						},
						{
							home: {
								tid: 6,
								cid: 1,
								winp: 0.7439024390243902,
								won: 1,
								seed: 2,
							},
							away: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 4,
								seed: 3,
							},
						},
					],
					[
						{
							home: {
								tid: 8,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 0,
								seed: 3,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 2,
								seed: 3,
							},
						},
					],
					[
						{
							home: {
								tid: 4,
								cid: 1,
								winp: 0.8048780487804879,
								won: 0,
								seed: 1,
							},
							away: {
								tid: 8,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
						},
					],
				],
			};

			await idb.cache.playoffSeries.put(ps);
			const awarded = await get("fo_fo_fo").check();
			assert.equal(awarded, false);
		});
	});

	describe("septuawinarian", () => {
		test("award achievement only if user's team has more than 70 wins", async () => {
			let awarded = await get("septuawinarian").check();
			assert.equal(awarded, false);

			const teamSeason = await idb.cache.teamSeasons.indexGet(
				"teamSeasonsByTidSeason",
				[g.get("userTid"), g.get("season")],
			);
			teamSeason.won = 70;
			await idb.cache.teamSeasons.put(teamSeason);

			awarded = await get("septuawinarian").check();
			assert.equal(awarded, true);
		});
	});

	describe("98_degrees", () => {
		test("award achievement for 82-0 regular season record and 16-0 playoff record for user's team", async () => {
			// tid 7 wins 4-0 every series
			const ps = {
				season: 2013,
				currentRound: 3,
				series: [
					[
						{
							home: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 16,
								cid: 0,
								winp: 0.47560975609756095,
								won: 0,
								seed: 8,
							},
						},
						{
							home: {
								tid: 1,
								cid: 0,
								winp: 0.6097560975609756,
								won: 4,
								seed: 4,
							},
							away: {
								tid: 15,
								cid: 0,
								winp: 0.5609756097560976,
								won: 1,
								seed: 5,
							},
						},
						{
							home: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 5,
								cid: 0,
								winp: 0.5609756097560976,
								won: 3,
								seed: 6,
							},
						},
						{
							home: {
								tid: 29,
								cid: 0,
								winp: 0.6951219512195121,
								won: 3,
								seed: 2,
							},
							away: {
								tid: 17,
								cid: 0,
								winp: 0.5121951219512195,
								won: 4,
								seed: 7,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 23,
								cid: 1,
								winp: 0.5365853658536586,
								won: 0,
								seed: 8,
							},
						},
						{
							home: {
								tid: 12,
								cid: 1,
								winp: 0.6829268292682927,
								won: 1,
								seed: 4,
							},
							away: {
								tid: 24,
								cid: 1,
								winp: 0.5853658536585366,
								won: 4,
								seed: 5,
							},
						},
						{
							home: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 14,
								cid: 1,
								winp: 0.5853658536585366,
								won: 0,
								seed: 6,
							},
						},
						{
							home: {
								tid: 6,
								cid: 1,
								winp: 0.7439024390243902,
								won: 4,
								seed: 2,
							},
							away: {
								tid: 18,
								cid: 1,
								winp: 0.5487804878048781,
								won: 3,
								seed: 7,
							},
						},
					],
					[
						{
							home: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 1,
								cid: 0,
								winp: 0.6097560975609756,
								won: 0,
								seed: 4,
							},
						},
						{
							home: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 17,
								cid: 0,
								winp: 0.5121951219512195,
								won: 1,
								seed: 7,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 24,
								cid: 1,
								winp: 0.5853658536585366,
								won: 3,
								seed: 5,
							},
						},
						{
							home: {
								tid: 6,
								cid: 1,
								winp: 0.7439024390243902,
								won: 1,
								seed: 2,
							},
							away: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 4,
								seed: 3,
							},
						},
					],
					[
						{
							home: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 0,
								seed: 3,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 2,
								seed: 3,
							},
						},
					],
					[
						{
							home: {
								tid: 4,
								cid: 1,
								winp: 0.8048780487804879,
								won: 0,
								seed: 1,
							},
							away: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
						},
					],
				],
			};

			await idb.cache.playoffSeries.put(ps);
			const teamSeason = await idb.cache.teamSeasons.indexGet(
				"teamSeasonsByTidSeason",
				[g.get("userTid"), g.get("season")],
			);
			teamSeason.won = 82;
			teamSeason.lost = 0;
			await idb.cache.teamSeasons.put(teamSeason);

			const awarded = await get("98_degrees").check();
			assert.equal(awarded, true);
		});

		test("don't award achievement without 82-0 regular season", async () => {
			const teamSeason = await idb.cache.teamSeasons.indexGet(
				"teamSeasonsByTidSeason",
				[g.get("userTid"), g.get("season")],
			);
			teamSeason.won = 82;
			teamSeason.lost = 1;
			await idb.cache.teamSeasons.put(teamSeason);

			let awarded = await get("98_degrees").check();
			assert.equal(awarded, false);

			teamSeason.won = 81;
			teamSeason.lost = 0;
			await idb.cache.teamSeasons.put(teamSeason);

			awarded = await get("98_degrees").check();
			assert.equal(awarded, false);
		});

		test("don't be awarded without 16-0 playoffs", async () => {
			// tid 7 lost a game
			const ps = {
				season: 2013,
				currentRound: 3,
				series: [
					[
						{
							home: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 16,
								cid: 0,
								winp: 0.47560975609756095,
								won: 1,
								seed: 8,
							},
						},
						{
							home: {
								tid: 1,
								cid: 0,
								winp: 0.6097560975609756,
								won: 4,
								seed: 4,
							},
							away: {
								tid: 15,
								cid: 0,
								winp: 0.5609756097560976,
								won: 1,
								seed: 5,
							},
						},
						{
							home: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 5,
								cid: 0,
								winp: 0.5609756097560976,
								won: 3,
								seed: 6,
							},
						},
						{
							home: {
								tid: 29,
								cid: 0,
								winp: 0.6951219512195121,
								won: 3,
								seed: 2,
							},
							away: {
								tid: 17,
								cid: 0,
								winp: 0.5121951219512195,
								won: 4,
								seed: 7,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 23,
								cid: 1,
								winp: 0.5365853658536586,
								won: 0,
								seed: 8,
							},
						},
						{
							home: {
								tid: 12,
								cid: 1,
								winp: 0.6829268292682927,
								won: 1,
								seed: 4,
							},
							away: {
								tid: 24,
								cid: 1,
								winp: 0.5853658536585366,
								won: 4,
								seed: 5,
							},
						},
						{
							home: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 14,
								cid: 1,
								winp: 0.5853658536585366,
								won: 0,
								seed: 6,
							},
						},
						{
							home: {
								tid: 6,
								cid: 1,
								winp: 0.7439024390243902,
								won: 4,
								seed: 2,
							},
							away: {
								tid: 18,
								cid: 1,
								winp: 0.5487804878048781,
								won: 3,
								seed: 7,
							},
						},
					],
					[
						{
							home: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 1,
								cid: 0,
								winp: 0.6097560975609756,
								won: 0,
								seed: 4,
							},
						},
						{
							home: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 4,
								seed: 3,
							},
							away: {
								tid: 17,
								cid: 0,
								winp: 0.5121951219512195,
								won: 1,
								seed: 7,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 24,
								cid: 1,
								winp: 0.5853658536585366,
								won: 3,
								seed: 5,
							},
						},
						{
							home: {
								tid: 6,
								cid: 1,
								winp: 0.7439024390243902,
								won: 1,
								seed: 2,
							},
							away: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 4,
								seed: 3,
							},
						},
					],
					[
						{
							home: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 26,
								cid: 0,
								winp: 0.6219512195121951,
								won: 0,
								seed: 3,
							},
						},
						{
							home: {
								tid: 11,
								cid: 1,
								winp: 0.8048780487804879,
								won: 4,
								seed: 1,
							},
							away: {
								tid: 20,
								cid: 1,
								winp: 0.7317073170731707,
								won: 2,
								seed: 3,
							},
						},
					],
					[
						{
							home: {
								tid: 4,
								cid: 1,
								winp: 0.8048780487804879,
								won: 0,
								seed: 1,
							},
							away: {
								tid: 7,
								cid: 0,
								winp: 0.7317073170731707,
								won: 4,
								seed: 1,
							},
						},
					],
				],
			};

			await idb.cache.playoffSeries.put(ps);
			const teamSeason = await idb.cache.teamSeasons.indexGet(
				"teamSeasonsByTidSeason",
				[g.get("userTid"), g.get("season")],
			);
			teamSeason.won = 82;
			teamSeason.lost = 0;
			await idb.cache.teamSeasons.put(teamSeason);

			const awarded = await get("98_degrees").check();
			assert.equal(awarded, false);
		});
	});

	describe("hardware_store", () => {
		test("award achievement if user's team sweeps awards", async () => {
			// tid 7 wins all awards
			const awards = {
				season: 2013,
				roy: {
					pid: 501,
					name: "Timothy Gonzalez",
					tid: 7,
					abbrev: "ATL",
					pts: 30.135135135135137,
					trb: 9.18918918918919,
					ast: 0.7972972972972973,
				},
				mvp: {
					pid: 280,
					name: "William Jarosz",
					tid: 7,
					abbrev: "PHI",
					pts: 28.951219512195124,
					trb: 11.329268292682928,
					ast: 0.6585365853658537,
				},
				mip: {
					pid: 280,
					name: "William Jarosz",
					tid: 7,
					abbrev: "PHI",
					pts: 28.951219512195124,
					trb: 11.329268292682928,
					ast: 0.6585365853658537,
				},
				smoy: {
					pid: 505,
					name: "Donald Gallager",
					tid: 7,
					abbrev: "MON",
					pts: 22.195121951219512,
					trb: 7.878048780487805,
					ast: 0.7682926829268293,
				},
				dpoy: {
					pid: 280,
					name: "William Jarosz",
					tid: 7,
					abbrev: "PHI",
					trb: 11.329268292682928,
					blk: 3.2560975609756095,
					stl: 2.2804878048780486,
				},
				finalsMvp: {
					pid: 335,
					name: "Erwin Ritchey",
					tid: 7,
					abbrev: "POR",
					pts: 24.4,
					trb: 8.85,
					ast: 2.65,
				},
			};

			await idb.cache.awards.put(awards);
			const awarded = await get("hardware_store").check();
			assert.equal(awarded, true);
		});

		test("don't award achievement if user's team loses an award", async () => {
			// tid 7 wins loses an award!
			const awards = {
				season: 2013,
				roy: {
					pid: 501,
					name: "Timothy Gonzalez",
					tid: 7,
					abbrev: "ATL",
					pts: 30.135135135135137,
					trb: 9.18918918918919,
					ast: 0.7972972972972973,
				},
				mvp: {
					pid: 280,
					name: "William Jarosz",
					tid: 7,
					abbrev: "PHI",
					pts: 28.951219512195124,
					trb: 11.329268292682928,
					ast: 0.6585365853658537,
				},
				mip: {
					pid: 280,
					name: "William Jarosz",
					tid: 7,
					abbrev: "PHI",
					pts: 28.951219512195124,
					trb: 11.329268292682928,
					ast: 0.6585365853658537,
				},
				smoy: {
					pid: 505,
					name: "Donald Gallager",
					tid: 8,
					abbrev: "MON",
					pts: 22.195121951219512,
					trb: 7.878048780487805,
					ast: 0.7682926829268293,
				},
				dpoy: {
					pid: 280,
					name: "William Jarosz",
					tid: 7,
					abbrev: "PHI",
					trb: 11.329268292682928,
					blk: 3.2560975609756095,
					stl: 2.2804878048780486,
				},
				finalsMvp: {
					pid: 335,
					name: "Erwin Ritchey",
					tid: 7,
					abbrev: "POR",
					pts: 24.4,
					trb: 8.85,
					ast: 2.65,
				},
			};

			await idb.cache.awards.put(awards);
			const awarded = await get("hardware_store").check();
			assert.equal(awarded, false);
		});

		test("don't award achievement if another team sweeps the awards", async () => {
			// tid 7 is changed to 8
			const awards = {
				season: 2013,
				roy: {
					pid: 501,
					name: "Timothy Gonzalez",
					tid: 8,
					abbrev: "ATL",
					pts: 30.135135135135137,
					trb: 9.18918918918919,
					ast: 0.7972972972972973,
				},
				mvp: {
					pid: 280,
					name: "William Jarosz",
					tid: 8,
					abbrev: "PHI",
					pts: 28.951219512195124,
					trb: 11.329268292682928,
					ast: 0.6585365853658537,
				},
				mip: {
					pid: 280,
					name: "William Jarosz",
					tid: 8,
					abbrev: "PHI",
					pts: 28.951219512195124,
					trb: 11.329268292682928,
					ast: 0.6585365853658537,
				},
				smoy: {
					pid: 505,
					name: "Donald Gallager",
					tid: 8,
					abbrev: "MON",
					pts: 22.195121951219512,
					trb: 7.878048780487805,
					ast: 0.7682926829268293,
				},
				dpoy: {
					pid: 280,
					name: "William Jarosz",
					tid: 8,
					abbrev: "PHI",
					trb: 11.329268292682928,
					blk: 3.2560975609756095,
					stl: 2.2804878048780486,
				},
				finalsMvp: {
					pid: 335,
					name: "Erwin Ritchey",
					tid: 8,
					abbrev: "POR",
					pts: 24.4,
					trb: 8.85,
					ast: 2.65,
				},
			};

			await idb.cache.awards.put(awards);
			const awarded = await get("hardware_store").check();
			assert.equal(awarded, false);
		});
	});

	describe("sleeper_pick", () => {
		test("award achievement if user's non-lottery pick wins ROY while on user's team", async () => {
			let awarded = await get("sleeper_pick").check();
			assert.equal(awarded, false);

			const p = (await idb.cache.players.getAll())[0];
			p.tid = g.get("userTid");
			p.draft.tid = g.get("userTid");
			p.draft.round = 1;
			p.draft.pick = 20;
			p.draft.year = g.get("season") - 1;
			await idb.cache.players.put(p);

			// ROY is pid 1 on tid 7
			const awards = {
				season: 2013,
				roy: {
					pid: p.pid,
					name: `${p.firstName} ${p.lastName}`,
					tid: p.tid,
					abbrev: "ATL",
					pts: 30,
					trb: 9,
					ast: 9,
				},
			};

			await idb.cache.awards.put(awards);

			awarded = await get("sleeper_pick").check();
			assert.equal(awarded, true);
		});

		test("don't award achievement if not currently on user's team", async () => {
			const p = (await idb.cache.players.getAll())[0];
			p.tid = 15;
			await idb.cache.players.put(p);

			const awarded = await get("sleeper_pick").check();
			assert.equal(awarded, false);
		});

		test("don't award achievement if not drafted by user", async () => {
			const p = (await idb.cache.players.getAll())[0];
			p.tid = g.get("userTid");
			p.draft.tid = 15;
			await idb.cache.players.put(p);

			const awarded = await get("sleeper_pick").check();
			assert.equal(awarded, false);
		});

		test("don't award achievement if lottery pick", async () => {
			const p = (await idb.cache.players.getAll())[0];
			p.draft.tid = g.get("userTid");
			p.draft.pick = 7;
			await idb.cache.players.put(p);

			const awarded = await get("sleeper_pick").check();
			assert.equal(awarded, false);
		});

		test("don't award achievement if old pick", async () => {
			const p = (await idb.cache.players.getAll())[0];
			p.draft.pick = 15;
			p.draft.year = g.get("season") - 2;
			await idb.cache.players.put(p);

			const awarded = await get("sleeper_pick").check();
			assert.equal(awarded, false);
		});

		test("don't award achievement if not ROY", async () => {
			// Switch to another player
			const p = (await idb.cache.players.getAll())[1];

			const awards = {
				season: 2013,
				roy: {
					pid: p.pid,
					name: "Timothy Gonzalez",
					tid: 15,
					abbrev: "ATL",
					pts: 30.135135135135137,
					trb: 9.18918918918919,
					ast: 0.7972972972972973,
				},
			};
			await idb.cache.awards.put(awards);

			p.draft.year = g.get("season") - 1;
			await idb.cache.players.put(p);

			const awarded = await get("sleeper_pick").check();
			assert.equal(awarded, false);
		});
	});
});
