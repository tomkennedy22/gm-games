import range from "lodash/range";
import assert from "assert";
import GameSim from ".";
import { player, team } from "../../../../deion/worker/core";
import loadTeams from "../../../../deion/worker/core/game/loadTeams";
import { g, helpers } from "../../../../deion/worker/util";
import testHelpers from "../../../../deion/test/helpers";
import initFootball from "../../init";
import initBasketball from "../../../../basketball/worker/init";

const genTwoTeams = async () => {
	testHelpers.resetG();
	g.setWithoutSavingToDB("season", 2013);
	const teamsDefault = helpers.getTeamsDefault().slice(0, 2);
	await testHelpers.resetCache({
		players: [
			...range(50).map(() => player.generate(0, 25, 2010, true, 15.5)),
			...range(50).map(() => player.generate(1, 25, 2010, true, 15.5)),
		],
		teams: teamsDefault.map(team.generate),
		teamSeasons: teamsDefault.map(t => team.genSeasonRow(t.tid)),
		teamStats: teamsDefault.map(t => team.genStatsRow(t.tid)),
	});
};

describe("football/worker/core/GameSim", () => {
	beforeAll(async () => {
		process.env.SPORT = "football";
		await initFootball();
		await genTwoTeams();
	});
	afterAll(async () => {
		process.env.SPORT = "basketball";
		await initBasketball();
	});

	test("kick a field goal when down 2 at the end of the game and there is little time left", async () => {
		const teams = await loadTeams([0, 1]);
		const game = new GameSim(0, teams[0], teams[1], false); // Down by 2, 4th quarter, ball on the opp 20 yard line, 6 seconds left

		game.awaitingKickoff = undefined;
		game.o = 0;
		game.d = 1;
		game.team[0].stat.ptsQtrs = [0, 0, 0, 0];
		game.team[1].stat.ptsQtrs = [0, 0, 0, 2];
		game.scrimmage = 80;
		game.clock = 0.01;
		assert.equal(game.getPlayType(), "fieldGoal");
	});

	test("kick a field goal at the end of the 2nd quarter rather than running out the clock", async () => {
		const teams = await loadTeams([0, 1]);
		const game = new GameSim(0, teams[0], teams[1], false); // Arbitrary score, 2nd quarter, ball on the opp 20 yard line, 6 seconds left

		game.awaitingKickoff = undefined;
		game.o = 0;
		game.d = 1;
		game.team[0].stat.ptsQtrs = [0, Math.round(Math.random() * 100)];
		game.team[1].stat.ptsQtrs = [0, Math.round(Math.random() * 100)];
		game.scrimmage = 80;
		game.clock = 0.01;
		assert.equal(game.getPlayType(), "fieldGoal");
	});
});
