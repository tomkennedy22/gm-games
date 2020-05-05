import { g, helpers, random } from "../../../deion/worker/util";

type PlayType =
	| "ast"
	| "blkAtRim"
	| "blkLowPost"
	| "blkMidRange"
	| "blkTp"
	| "drb"
	| "fgAtRim"
	| "fgAtRimAndOne"
	| "fgLowPost"
	| "fgLowPostAndOne"
	| "fgMidRange"
	| "fgMidRangeAndOne"
	| "foulOut"
	| "ft"
	| "gameOver"
	| "injury"
	| "jumpBall"
	| "missAtRim"
	| "missFt"
	| "missLowPost"
	| "missMidRange"
	| "missTp"
	| "orb"
	| "overtime"
	| "pf"
	| "quarter"
	| "stl"
	| "sub"
	| "tov"
	| "tp"
	| "tpAndOne";
type ShotType = "atRim" | "ft" | "lowPost" | "midRange" | "threePointer";
type Stat =
	| "ast"
	| "ba"
	| "benchTime"
	| "blk"
	| "courtTime"
	| "drb"
	| "energy"
	| "fg"
	| "fgAtRim"
	| "fgLowPost"
	| "fgMidRange"
	| "fga"
	| "fgaAtRim"
	| "fgaLowPost"
	| "fgaMidRange"
	| "ft"
	| "fta"
	| "gs"
	| "min"
	| "orb"
	| "pf"
	| "pts"
	| "stl"
	| "tov"
	| "tp"
	| "tpa";
type PlayerNumOnCourt = 0 | 1 | 2 | 3 | 4;
type TeamNum = 0 | 1;
type CompositeRating =
	| "blocking"
	| "fouling"
	| "passing"
	| "rebounding"
	| "stealing"
	| "turnovers"
	| "usage"
	| "jumpBall";
type PlayerGameSim = {
	id: number;
	name: string;
	age: number;
	pos: string;
	valueNoPot: number;
	stat: any;
	compositeRating: any;
	skills: string[];
	injured: boolean;
	ptModifier: number;
};
type TeamGameSim = {
	id: number;
	pace: number;
	// mean number of possessions the team likes to have in a game
	stat: any;
	compositeRating: any;
	player: PlayerGameSim[];
	synergy: {
		def: number;
		off: number;
		reb: number;
	};
};

const teamNums: [TeamNum, TeamNum] = [0, 1];

/**
 * Pick a player to do something.
 *
 * @param {Array.<number>} ratios output of this.ratingArray.
 * @param {number} exempt An integer representing a player that can't be picked (i.e. you can't assist your own shot, which is the only current use of exempt). The value of exempt ranges from 0 to 4, corresponding to the index of the player in this.playersOnCourt. This is *NOT* the same value as the player ID *or* the index of the this.team[t].player list. Yes, that's confusing.
 */
const pickPlayer = (
	ratios: [number, number, number, number, number],
	exempt?: PlayerNumOnCourt,
) => {
	if (exempt !== undefined) {
		ratios[exempt] = 0;
	}

	const rand =
		Math.random() * (ratios[0] + ratios[1] + ratios[2] + ratios[3] + ratios[4]);
	let pick: PlayerNumOnCourt;

	if (rand < ratios[0]) {
		pick = 0;
	} else if (rand < ratios[0] + ratios[1]) {
		pick = 1;
	} else if (rand < ratios[0] + ratios[1] + ratios[2]) {
		pick = 2;
	} else if (rand < ratios[0] + ratios[1] + ratios[2] + ratios[3]) {
		pick = 3;
	} else {
		pick = 4;
	}

	return pick;
};

/**
 * Convert energy into fatigue, which can be multiplied by a rating to get a fatigue-adjusted value.
 *
 * @param {number} energy A player's energy level, from 0 to 1 (0 = lots of energy, 1 = none).
 * @return {number} Fatigue, from 0 to 1 (0 = lots of fatigue, 1 = none).
 */
const fatigue = (energy: number): number => {
	energy += 0.05;

	if (energy > 1) {
		energy = 1;
	}

	return energy;
};

class GameSim {
	id: number;

	team: [TeamGameSim, TeamGameSim];

	playersOnCourt: [
		[number, number, number, number, number],
		[number, number, number, number, number],
	];

	startersRecorded: boolean;

	subsEveryN: number;

	overtimes: number;

	t: number;

	foulsThisQuarter: [number, number];

	foulsLastTwoMinutes: [number, number];

	averagePossessionLength: number;

	synergyFactor: number;

	lastScoringPlay: {
		team: number;
		player: number;
		type: ShotType;
		time: number;
	}[];

	clutchPlays: {
		text: string;
		showNotification: boolean;
		pids: [number];
		tids: [number];
	}[];

	o: TeamNum;

	d: TeamNum;

	playByPlay: any[] | undefined;

	allStarGame: boolean;

	/**
	 * Initialize the two teams that are playing this game.
	 *
	 * When an instance of this class is created, information about the two teams is passed to GameSim. Then GameSim.run will actually simulate a game and return the results (i.e. stats) of the simulation. Also see core.game where the inputs to this function are generated.
	 */
	constructor(
		gid: number,
		team1: TeamGameSim,
		team2: TeamGameSim,
		doPlayByPlay: boolean,
	) {
		if (doPlayByPlay) {
			this.playByPlay = [];
		}

		this.id = gid;
		this.team = [team1, team2]; // If a team plays twice in a day, this needs to be a deep copy

		// Starting lineups, which will be reset by updatePlayersOnCourt. This must be done because of injured players in the top 5.
		this.playersOnCourt = [
			[0, 1, 2, 3, 4],
			[0, 1, 2, 3, 4],
		];
		this.startersRecorded = false; // Used to track whether the *real* starters have been recorded or not.

		this.updatePlayersOnCourt();
		this.updateSynergy();
		this.subsEveryN = 6; // How many possessions to wait before doing substitutions

		this.overtimes = 0; // Number of overtime periods that have taken place

		this.t = g.get("quarterLength"); // Game clock, in minutes

		this.foulsThisQuarter = [0, 0];
		this.foulsLastTwoMinutes = [0, 0];
		const numPossessions =
			Math.round((this.team[0].pace + this.team[1].pace) / 2) * 1.09;
		this.averagePossessionLength = 48 / (2 * numPossessions); // [min]

		// Parameters
		this.synergyFactor = 0.1; // How important is synergy?

		this.lastScoringPlay = [];
		this.clutchPlays = [];
		this.allStarGame = this.team[0].id === -1 && this.team[1].id === -2;

		if (!this.allStarGame) {
			this.homeCourtAdvantage();
		}

		this.o = 0;
		this.d = 1;
	}

	/**
	 * Home court advantage.
	 *
	 * Scales composite ratings, giving home players bonuses and away players penalties.
	 *
	 */
	homeCourtAdvantage() {
		const homeCourtModifier = helpers.bound(
			1 + g.get("homeCourtAdvantage") / 100,
			0.01,
			Infinity,
		);

		for (const t of teamNums) {
			let factor;

			if (t === 0) {
				factor = homeCourtModifier; // Bonus for home team
			} else {
				factor = 1.0 / homeCourtModifier; // Penalty for away team
			}

			for (let p = 0; p < this.team[t].player.length; p++) {
				for (const r of Object.keys(this.team[t].player[p].compositeRating)) {
					if (r !== "endurance") {
						this.team[t].player[p].compositeRating[r] *= factor;
					}
				}
			}
		}
	}

	/**
	 * Simulates the game and returns the results.
	 *
	 * Also see core.game where the outputs of this function are used.
	 *
	 * @return {Array.<Object>} Game result object, an array of two objects similar to the inputs to GameSim, but with both the team and player "stat" objects filled in and the extraneous data (pace, valueNoPot, compositeRating) removed. In other words...
	 *     {
	 *         "gid": 0,
	 *         "overtimes": 0,
	 *         "team": [
	 *             {
	 *                 "id": 0,
	 *                 "stat": {},
	 *                 "player": [
	 *                     {
	 *                         "id": 0,
	 *                         "stat": {},
	 *                         "skills": [],
	 *                         "injured": false
	 *                     },
	 *                     ...
	 *                 ]
	 *             },
	 *         ...
	 *         ]
	 *     }
	 */
	run() {
		// Simulate the game up to the end of regulation
		this.simRegulation();

		// Play overtime periods if necessary
		while (this.team[0].stat.pts === this.team[1].stat.pts) {
			this.checkGameTyingShot();
			this.simOvertime();
		}

		this.recordPlay("gameOver");

		this.checkGameWinner();

		// Delete stuff that isn't needed before returning
		for (const t of teamNums) {
			delete this.team[t].compositeRating;

			delete this.team[t].pace;

			for (let p = 0; p < this.team[t].player.length; p++) {
				delete this.team[t].player[p].age;

				delete this.team[t].player[p].valueNoPot;
				delete this.team[t].player[p].compositeRating;

				delete this.team[t].player[p].ptModifier;
				delete this.team[t].player[p].stat.benchTime;
				delete this.team[t].player[p].stat.courtTime;
				delete this.team[t].player[p].stat.energy;
			}
		}

		const out = {
			gid: this.id,
			overtimes: this.overtimes,
			team: this.team,
			clutchPlays: this.clutchPlays,
			playByPlay: this.playByPlay,
		};

		if (out.playByPlay !== undefined) {
			out.playByPlay.unshift({
				type: "init",
				boxScore: this.team,
			});
		}

		return out;
	}

	jumpBall() {
		const jumpers = ([0, 1] as const).map(t => {
			const ratios = this.ratingArray("jumpBall", t);
			const maxRatio = Math.max(...ratios);
			let ind = ratios.findIndex(ratio => ratio === maxRatio);
			if (ind === undefined) {
				ind = 0;
			}
			return this.playersOnCourt[t][ind];
		});
		const prob =
			0.5 *
			(this.team[0].player[jumpers[0]].compositeRating.jumpBall /
				this.team[1].player[jumpers[1]].compositeRating.jumpBall) **
				3;

		// Team assignments are the opposite of what you'd expect, cause in simPossession it swaps possession at top
		this.o = Math.random() < prob ? 1 : 0;
		this.d = this.o === 0 ? 1 : 0;
		this.recordPlay("jumpBall", this.d, [
			this.team[this.d].player[jumpers[this.d]].name,
		]);
		return this.d;
	}

	simRegulation() {
		let quarter = 1;
		const wonJump = this.jumpBall();

		while (true) {
			if (quarter === 3) {
				// Team assignments are the opposite of what you'd expect, cause in simPossession it swaps possession at top
				this.o = wonJump === 0 ? 0 : 1;
				this.d = this.o === 0 ? 1 : 0;
			}

			while (this.t > 0.5 / 60) {
				this.simPossession();
			}

			quarter += 1;

			if (quarter === 5) {
				break;
			}

			this.team[0].stat.ptsQtrs.push(0);
			this.team[1].stat.ptsQtrs.push(0);
			this.foulsThisQuarter = [0, 0];
			this.foulsLastTwoMinutes = [0, 0];
			this.t = g.get("quarterLength");
			this.lastScoringPlay = [];
			this.recordPlay("quarter");
		}
	}

	simOvertime() {
		this.t = Math.ceil(0.4 * g.get("quarterLength")); // 5 minutes by default, but scales

		this.lastScoringPlay = [];
		this.overtimes += 1;
		this.team[0].stat.ptsQtrs.push(0);
		this.team[1].stat.ptsQtrs.push(0);
		this.recordPlay("overtime");
		this.jumpBall();

		while (this.t > 0.5 / 60) {
			this.simPossession();
		}
	}

	getPossessionLength() {
		const quarter = this.team[this.o].stat.ptsQtrs.length;
		const pointDifferential =
			this.team[this.o].stat.pts - this.team[this.d].stat.pts;

		// Run out the clock if winning
		if (quarter >= 4 && this.t <= 24 / 60 && pointDifferential > 0) {
			return this.t;
		}

		// Booleans that can influence possession length strategy
		const holdForLastShot =
			this.t <= 26 / 60 && (quarter <= 3 || pointDifferential >= 0);
		const catchUp =
			quarter >= 4 &&
			((this.t <= 3 && pointDifferential <= 10) ||
				(this.t <= 2 && pointDifferential <= 5) ||
				(this.t <= 1 && pointDifferential < 0));
		const maintainLead =
			quarter >= 4 &&
			((this.t <= 3 && pointDifferential > 10) ||
				(this.t <= 2 && pointDifferential > 5) ||
				(this.t <= 1 && pointDifferential > 0));
		const twoForOne = this.t >= 32 / 60 && this.t <= 52 / 60;
		let lowerBound = 4 / 60;
		let upperBound = 24 / 60;

		if (lowerBound > this.t) {
			lowerBound = this.t;
		}

		if (upperBound > this.t) {
			upperBound = this.t;
		}

		let possessionLength; // [min]

		if (holdForLastShot) {
			possessionLength = random.gauss(this.t, 5 / 60);
		} else if (catchUp) {
			possessionLength = random.gauss(
				this.averagePossessionLength - 3 / 60,
				5 / 60,
			);
			if (this.t < 48 / 60 && this.t > 4 / 60) {
				upperBound = Math.sqrt(this.t);
			}
		} else if (maintainLead) {
			possessionLength = random.gauss(
				this.averagePossessionLength + 3 / 60,
				5 / 60,
			);
		} else {
			possessionLength = random.gauss(this.averagePossessionLength, 5 / 60);
		}

		if (twoForOne && !catchUp && !maintainLead) {
			if (Math.random() < 0.6) {
				// There are between 32 and 52 seconds remaining, and we'd like to get the shot up somewhere between 29 and 35 seconds
				lowerBound = this.t - 35 / 60;
				upperBound = this.t - 29 / 60;
			}
		}

		if (upperBound < lowerBound) {
			lowerBound = upperBound;
		}

		if (lowerBound < 0) {
			lowerBound = 0;
		}
		if (upperBound < 1 / 60) {
			upperBound = 1 / 60;
		}

		const bounded1 = helpers.bound(possessionLength, lowerBound, upperBound);

		return helpers.bound(bounded1, 0, this.t);
	}

	simPossession() {
		// Possession change
		this.o = this.o === 1 ? 0 : 1;
		this.d = this.o === 1 ? 0 : 1;
		this.updateTeamCompositeRatings();

		// Clock
		const possessionLength = this.getPossessionLength();
		this.t -= possessionLength;

		const outcome = this.getPossessionOutcome(possessionLength);

		// Swap o and d so that o will get another possession when they are swapped again at the beginning of the loop.
		if (outcome === "orb" || outcome === "nonShootingFoul") {
			this.o = this.o === 1 ? 0 : 1;
			this.d = this.o === 1 ? 0 : 1;
		}

		this.updatePlayingTime(possessionLength);
		this.injuries();

		const gameOver =
			this.team[this.o].stat.ptsQtrs.length >= 4 &&
			this.team[this.d].stat.pts != this.team[this.o].stat.pts;

		if (!gameOver && random.randInt(1, this.subsEveryN) === 1) {
			const substitutions = this.updatePlayersOnCourt();

			if (substitutions) {
				this.updateSynergy();
			}
		}
	}

	/**
	 * Perform appropriate substitutions.
	 *
	 * Can this be sped up?
	 *
	 * @return {boolean} true if a substitution occurred, false otherwise.
	 */
	updatePlayersOnCourt(shooter?: PlayerNumOnCourt) {
		let substitutions = false;
		let blowout = false;

		if (this.o !== undefined && this.d !== undefined) {
			const diff = Math.abs(
				this.team[this.d].stat.pts - this.team[this.o].stat.pts,
			);
			const quarter = this.team[this.o].stat.ptsQtrs.length;
			blowout =
				quarter === 4 &&
				((diff >= 30 && this.t < 12) ||
					(diff >= 25 && this.t < 9) ||
					(diff >= 20 && this.t < 7) ||
					(diff >= 15 && this.t < 3) ||
					(diff >= 10 && this.t < 1));
		}

		for (const t of teamNums) {
			// Overall values scaled by fatigue, etc
			const ovrs: number[] = [];

			for (let p = 0; p < this.team[t].player.length; p++) {
				// Injured or fouled out players can't play
				if (
					this.team[t].player[p].injured ||
					(g.get("foulsNeededToFoulOut") > 0 &&
						this.team[t].player[p].stat.pf >= g.get("foulsNeededToFoulOut"))
				) {
					ovrs[p] = -Infinity;
				} else {
					ovrs[p] =
						this.team[t].player[p].valueNoPot *
						fatigue(this.team[t].player[p].stat.energy) *
						random.uniform(0.9, 1.1);

					if (!this.allStarGame) {
						ovrs[p] *= this.team[t].player[p].ptModifier;
					}

					// Also scale based on margin late in games, so stars play less in blowouts (this doesn't really work that well, but better than nothing)
					if (blowout) {
						ovrs[p] *= (p + 1) / 10;
					}
				}
			}

			// Loop through players on court (in inverse order of current roster position)
			for (let pp = 0; pp < this.playersOnCourt[t].length; pp++) {
				const p = this.playersOnCourt[t][pp];
				const onCourtIsIneligible = ovrs[p] === -Infinity;
				this.playersOnCourt[t][pp] = p; // Don't sub out guy shooting FTs!

				if (t === this.o && pp === shooter) {
					continue;
				}

				// Loop through bench players (in order of current roster position) to see if any should be subbed in)
				for (let b = 0; b < this.team[t].player.length; b++) {
					if (this.playersOnCourt[t].includes(b)) {
						continue;
					}

					const benchIsValidAndBetter =
						this.team[t].player[p].stat.courtTime > 3 &&
						this.team[t].player[b].stat.benchTime > 3 &&
						ovrs[b] > ovrs[p];
					const benchIsEligible = ovrs[b] !== -Infinity;

					if (
						benchIsValidAndBetter ||
						(onCourtIsIneligible && benchIsEligible)
					) {
						// Check if position of substitute makes for a valid lineup
						const pos: string[] = [];

						for (let j = 0; j < this.playersOnCourt[t].length; j++) {
							if (j !== pp) {
								pos.push(this.team[t].player[this.playersOnCourt[t][j]].pos);
							}
						}

						pos.push(this.team[t].player[b].pos);

						// Requre 2 Gs (or 1 PG) and 2 Fs (or 1 C)
						let numG = 0;
						let numPG = 0;
						let numF = 0;
						let numC = 0;

						for (let j = 0; j < pos.length; j++) {
							if (pos[j].includes("G")) {
								numG += 1;
							}

							if (pos[j] === "PG") {
								numPG += 1;
							}

							if (pos[j].includes("F")) {
								numF += 1;
							}

							if (pos[j] === "C") {
								numC += 1;
							}
						}

						if ((numG < 2 && numPG === 0) || (numF < 2 && numC === 0)) {
							if (
								fatigue(this.team[t].player[p].stat.energy) > 0.7 &&
								!onCourtIsIneligible
							) {
								// Exception for ridiculously tired players, so really unbalanced teams won't play starters whole game
								continue;
							}
						}

						substitutions = true;

						// Substitute player
						this.playersOnCourt[t][pp] = b;
						this.team[t].player[b].stat.courtTime = random.uniform(-2, 2);
						this.team[t].player[b].stat.benchTime = random.uniform(-2, 2);
						this.team[t].player[p].stat.courtTime = random.uniform(-2, 2);
						this.team[t].player[p].stat.benchTime = random.uniform(-2, 2);

						// Keep track of deviations from the normal starting lineup for the play-by-play
						if (this.playByPlay !== undefined) {
							this.playByPlay.push({
								type: "sub",
								t,
								on: this.team[t].player[b].id,
								off: this.team[t].player[p].id,
							});
						}

						// It's only a "substitution" if it's not the starting lineup
						if (this.startersRecorded) {
							this.recordPlay("sub", t, [
								this.team[t].player[b].name,
								this.team[t].player[p].name,
							]);
						}

						break;
					}
				}
			}
		}

		// Record starters if that hasn't been done yet. This should run the first time this function is called, and never again.
		if (!this.startersRecorded) {
			for (const t of teamNums) {
				for (let p = 0; p < this.team[t].player.length; p++) {
					if (this.playersOnCourt[t].includes(p)) {
						this.recordStat(t, p, "gs");
					}
				}
			}

			this.startersRecorded = true;
		}

		return substitutions;
	}

	/**
	 * Update synergy.
	 *
	 * This should be called after this.updatePlayersOnCourt as it only produces different output when the players on the court change.
	 */
	updateSynergy() {
		for (const t of teamNums) {
			// Count all the *fractional* skills of the active players on a team (including duplicates)
			const skillsCount = {
				"3": 0,
				A: 0,
				B: 0,
				Di: 0,
				Dp: 0,
				Po: 0,
				Ps: 0,
				R: 0,
			};

			for (let i = 0; i < 5; i++) {
				const p = this.playersOnCourt[t][i];

				// 1 / (1 + e^-(15 * (x - 0.61))) from 0 to 1
				// 0.61 is not always used - keep in sync with skills.js!

				skillsCount["3"] += helpers.sigmoid(
					this.team[t].player[p].compositeRating.shootingThreePointer,
					15,
					0.59,
				);
				skillsCount.A += helpers.sigmoid(
					this.team[t].player[p].compositeRating.athleticism,
					15,
					0.63,
				);
				skillsCount.B += helpers.sigmoid(
					this.team[t].player[p].compositeRating.dribbling,
					15,
					0.68,
				);
				skillsCount.Di += helpers.sigmoid(
					this.team[t].player[p].compositeRating.defenseInterior,
					15,
					0.57,
				);
				skillsCount.Dp += helpers.sigmoid(
					this.team[t].player[p].compositeRating.defensePerimeter,
					15,
					0.61,
				);
				skillsCount.Po += helpers.sigmoid(
					this.team[t].player[p].compositeRating.shootingLowPost,
					15,
					0.61,
				);
				skillsCount.Ps += helpers.sigmoid(
					this.team[t].player[p].compositeRating.passing,
					15,
					0.63,
				);
				skillsCount.R += helpers.sigmoid(
					this.team[t].player[p].compositeRating.rebounding,
					15,
					0.61,
				);
			}

			// Base offensive synergy
			this.team[t].synergy.off = 0;
			this.team[t].synergy.off += 5 * helpers.sigmoid(skillsCount["3"], 3, 2); // 5 / (1 + e^-(3 * (x - 2))) from 0 to 5

			this.team[t].synergy.off +=
				3 * helpers.sigmoid(skillsCount.B, 15, 0.75) +
				helpers.sigmoid(skillsCount.B, 5, 1.75); // 3 / (1 + e^-(15 * (x - 0.75))) + 1 / (1 + e^-(5 * (x - 1.75))) from 0 to 5

			this.team[t].synergy.off +=
				3 * helpers.sigmoid(skillsCount.Ps, 15, 0.75) +
				helpers.sigmoid(skillsCount.Ps, 5, 1.75) +
				helpers.sigmoid(skillsCount.Ps, 5, 2.75); // 3 / (1 + e^-(15 * (x - 0.75))) + 1 / (1 + e^-(5 * (x - 1.75))) + 1 / (1 + e^-(5 * (x - 2.75))) from 0 to 5

			this.team[t].synergy.off += helpers.sigmoid(skillsCount.Po, 15, 0.75); // 1 / (1 + e^-(15 * (x - 0.75))) from 0 to 5

			this.team[t].synergy.off +=
				helpers.sigmoid(skillsCount.A, 15, 1.75) +
				helpers.sigmoid(skillsCount.A, 5, 2.75); // 1 / (1 + e^-(15 * (x - 1.75))) + 1 / (1 + e^-(5 * (x - 2.75))) from 0 to 5

			this.team[t].synergy.off /= 17; // Punish teams for not having multiple perimeter skills

			const perimFactor =
				helpers.bound(
					Math.sqrt(1 + skillsCount.B + skillsCount.Ps + skillsCount["3"]) - 1,
					0,
					2,
				) / 2; // Between 0 and 1, representing the perimeter skills

			this.team[t].synergy.off *= 0.5 + 0.5 * perimFactor; // Defensive synergy

			this.team[t].synergy.def = 0;
			this.team[t].synergy.def += helpers.sigmoid(skillsCount.Dp, 15, 0.75); // 1 / (1 + e^-(15 * (x - 0.75))) from 0 to 5

			this.team[t].synergy.def += 2 * helpers.sigmoid(skillsCount.Di, 15, 0.75); // 2 / (1 + e^-(15 * (x - 0.75))) from 0 to 5

			this.team[t].synergy.def +=
				helpers.sigmoid(skillsCount.A, 5, 2) +
				helpers.sigmoid(skillsCount.A, 5, 3.25); // 1 / (1 + e^-(5 * (x - 2))) + 1 / (1 + e^-(5 * (x - 3.25))) from 0 to 5

			this.team[t].synergy.def /= 6; // Rebounding synergy

			this.team[t].synergy.reb = 0;
			this.team[t].synergy.reb +=
				helpers.sigmoid(skillsCount.R, 15, 0.75) +
				helpers.sigmoid(skillsCount.R, 5, 1.75); // 1 / (1 + e^-(15 * (x - 0.75))) + 1 / (1 + e^-(5 * (x - 1.75))) from 0 to 5

			this.team[t].synergy.reb /= 4;
		}
	}

	/**
	 * Update team composite ratings.
	 *
	 * This should be called once every possession, after this.updatePlayersOnCourt and this.updateSynergy as they influence output, to update the team composite ratings based on the players currently on the court.
	 */
	updateTeamCompositeRatings() {
		// Only update ones that are actually used
		const toUpdate = [
			"dribbling",
			"passing",
			"rebounding",
			"defense",
			"defensePerimeter",
			"blocking",
		];

		for (const t of teamNums) {
			for (let j = 0; j < toUpdate.length; j++) {
				const rating = toUpdate[j];
				this.team[t].compositeRating[rating] = 0;

				for (let i = 0; i < 5; i++) {
					const p = this.playersOnCourt[t][i];
					this.team[t].compositeRating[rating] +=
						this.team[t].player[p].compositeRating[rating] *
						fatigue(this.team[t].player[p].stat.energy);
				}

				this.team[t].compositeRating[rating] /= 5;
			}

			this.team[t].compositeRating.dribbling +=
				this.synergyFactor * this.team[t].synergy.off;
			this.team[t].compositeRating.passing +=
				this.synergyFactor * this.team[t].synergy.off;
			this.team[t].compositeRating.rebounding +=
				this.synergyFactor * this.team[t].synergy.reb;
			this.team[t].compositeRating.defense +=
				this.synergyFactor * this.team[t].synergy.def;
			this.team[t].compositeRating.defensePerimeter +=
				this.synergyFactor * this.team[t].synergy.def;
			this.team[t].compositeRating.blocking +=
				this.synergyFactor * this.team[t].synergy.def;
		}
	}

	/**
	 * Update playing time stats.
	 *
	 * This should be called once every possession, at the end, to record playing time and bench time for players.
	 */
	updatePlayingTime(possessionLength: number) {
		for (const t of teamNums) {
			// Update minutes (overall, court, and bench)
			for (let p = 0; p < this.team[t].player.length; p++) {
				if (this.playersOnCourt[t].includes(p)) {
					this.recordStat(t, p, "min", possessionLength);
					this.recordStat(t, p, "courtTime", possessionLength);

					// This used to be 0.04. Increase more to lower PT
					this.recordStat(
						t,
						p,
						"energy",
						-possessionLength *
							0.05 *
							(1 - this.team[t].player[p].compositeRating.endurance),
					);

					if (this.team[t].player[p].stat.energy < 0) {
						this.team[t].player[p].stat.energy = 0;
					}
				} else {
					this.recordStat(t, p, "benchTime", possessionLength);
					this.recordStat(t, p, "energy", possessionLength * 0.1);

					if (this.team[t].player[p].stat.energy > 1) {
						this.team[t].player[p].stat.energy = 1;
					}
				}
			}
		}
	}

	/**
	 * See if any injuries occurred this possession, and handle the consequences.
	 *
	 * This doesn't actually compute the type of injury, it just determines if a player is injured bad enough to miss the rest of the game.
	 */
	injuries() {
		if ((g as any).disableInjuries) {
			return;
		}

		let newInjury = false;
		const baseRate = this.allStarGame
			? g.get("injuryRate") / 4
			: g.get("injuryRate");

		for (const t of teamNums) {
			for (let p = 0; p < this.team[t].player.length; p++) {
				// Only players on the court can be injured
				if (this.playersOnCourt[t].includes(p)) {
					// Modulate injuryRate by age - assume default is 26 yo, and increase/decrease by 3%
					const injuryRate =
						baseRate * 1.03 ** (this.team[t].player[p].age - 26);

					if (Math.random() < injuryRate) {
						this.team[t].player[p].injured = true;
						newInjury = true;
						this.recordPlay("injury", t, [this.team[t].player[p].name]);
					}
				}
			}
		}

		// Sub out injured player
		if (newInjury) {
			this.updatePlayersOnCourt();
		}
	}

	/**
	 * Simulate a single possession.
	 *
	 * @return {string} Outcome of the possession, such as "tov", "drb", "orb", "fg", etc.
	 */
	getPossessionOutcome(possessionLength: number) {
		const timeBeforePossession = this.t + possessionLength;
		const diff = this.team[this.o].stat.pts - this.team[this.d].stat.pts;
		const offenseWinningByABit = diff > 0 && diff <= 6;
		const intentionalFoul =
			offenseWinningByABit &&
			this.team[0].stat.ptsQtrs.length >= 4 &&
			timeBeforePossession < 25 / 60;

		if (intentionalFoul) {
			// HACK! Add some time back on the clock. Would be better if this was like football and time ticked off during the play, not predefined. BE CAREFUL ABOUT CHANGING STUFF BELOW THIS IN THIS FUNCTION, IT MAY DEPEND ON THIS. Like anything reading this.t or intentionalFoul.
			const possessionLength2 = (Math.random() * 3) / 60;

			if (possessionLength2 < timeBeforePossession) {
				this.t = timeBeforePossession - possessionLength2;
			}
		}

		// If winning at end of game, just run out the clock
		if (
			this.t <= 0 &&
			this.team[this.o].stat.ptsQtrs.length >= 4 &&
			this.team[this.o].stat.pts > this.team[this.d].stat.pts
		) {
			return "endOfQuarter";
		}

		// With not much time on the clock at the end of a quarter, possession might end with the clock running out
		if (this.t <= 0 && possessionLength < 6 / 60) {
			if (Math.random() > (possessionLength / (8 / 60)) ** (1 / 4)) {
				return "endOfQuarter";
			}
		}

		// Turnover?
		if (Math.random() < this.probTov()) {
			return this.doTov(); // tov
		}

		const ratios = this.ratingArray("usage", this.o, 1.25);
		const shooter = pickPlayer(ratios);

		// Non-shooting foul?
		if (Math.random() < 0.08 * g.get("foulRateFactor") || intentionalFoul) {
			this.doPf(this.d);

			// In the bonus?
			const inBonus =
				(this.t <= 2 && this.foulsLastTwoMinutes[this.d] >= 2) ||
				(this.overtimes >= 1 && this.foulsThisQuarter[this.d] >= 4) ||
				this.foulsThisQuarter[this.d] >= 5;

			if (inBonus) {
				return this.doFt(shooter, 2); // fg, orb, or drb
			}

			return "nonShootingFoul";
		}

		// Shot!
		return this.doShot(shooter, possessionLength); // fg, orb, or drb
	}

	/**
	 * Probability of the current possession ending in a turnover.
	 *
	 * @return {number} Probability from 0 to 1.
	 */
	probTov() {
		return (
			(0.14 * this.team[this.d].compositeRating.defense) /
			(0.5 *
				(this.team[this.o].compositeRating.dribbling +
					this.team[this.o].compositeRating.passing))
		);
	}

	/**
	 * Turnover.
	 *
	 * @return {string} Either "tov" or "stl" depending on whether the turnover was caused by a steal or not.
	 */
	doTov() {
		const ratios = this.ratingArray("turnovers", this.o, 2);
		const p = this.playersOnCourt[this.o][pickPlayer(ratios)];
		this.recordStat(this.o, p, "tov");

		if (this.probStl() > Math.random()) {
			return this.doStl(p); // "stl"
		}

		this.recordPlay("tov", this.o, [this.team[this.o].player[p].name]);
		return "tov";
	}

	/**
	 * Probability that a turnover occurring in this possession is a steal.
	 *
	 * @return {number} Probability from 0 to 1.
	 */
	probStl() {
		return (
			(0.55 * this.team[this.d].compositeRating.defensePerimeter) /
			(0.5 *
				(this.team[this.o].compositeRating.dribbling +
					this.team[this.o].compositeRating.passing))
		);
	}

	/**
	 * Steal.
	 *
	 * @return {string} Currently always returns "stl".
	 */
	doStl(pStoleFrom: number) {
		const ratios = this.ratingArray("stealing", this.d, 5);
		const p = this.playersOnCourt[this.d][pickPlayer(ratios)];
		this.recordStat(this.d, p, "stl");
		this.recordPlay("stl", this.d, [
			this.team[this.d].player[p].name,
			this.team[this.o].player[pStoleFrom].name,
		]);
		return "stl";
	}

	/**
	 * Shot.
	 *
	 * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the shooting player.
	 * @return {string} Either "fg" or output of this.doReb, depending on make or miss and free throws.
	 */
	doShot(shooter: PlayerNumOnCourt, possessionLength: number) {
		const p = this.playersOnCourt[this.o][shooter];
		const currentFatigue = fatigue(this.team[this.o].player[p].stat.energy);

		// Is this an "assisted" attempt (i.e. an assist will be recorded if it's made)
		let passer: PlayerNumOnCourt | undefined;
		if (this.probAst() > Math.random()) {
			const ratios = this.ratingArray("passing", this.o, 10);
			passer = pickPlayer(ratios, shooter);
		}

		// Too many players shooting 3s at the high end - scale 0.55-1.0 to 0.55-0.85
		let shootingThreePointerScaled = this.team[this.o].player[p].compositeRating
			.shootingThreePointer;

		if (shootingThreePointerScaled > 0.55) {
			shootingThreePointerScaled =
				0.55 + (shootingThreePointerScaled - 0.55) * (0.3 / 0.45);
		}

		// In some situations (4th quarter late game situations depending on score, and last second heaves in other quarters) players shoot more 3s
		const diff = this.team[this.d].stat.pts - this.team[this.o].stat.pts;
		const quarter = this.team[this.o].stat.ptsQtrs.length;
		const forceThreePointer =
			(diff >= 3 &&
				diff <= 10 &&
				this.t <= 10 / 60 &&
				quarter >= 4 &&
				Math.random() > 0.9) ||
			(quarter < 4 && this.t === 0 && possessionLength <= 2.5 / 60);

		// Pick the type of shot and store the success rate (with no defense) in probMake and the probability of an and one in probAndOne
		let probAndOne;
		let probMake;
		let probMissAndFoul;
		let type: ShotType;

		if (
			forceThreePointer ||
			(this.team[this.o].player[p].compositeRating.shootingThreePointer >
				0.35 &&
				Math.random() < 0.67 * shootingThreePointerScaled)
		) {
			// Three pointer
			type = "threePointer";
			probMissAndFoul = 0.02;
			probMake = shootingThreePointerScaled * 0.3 + 0.36;
			probAndOne = 0.01;

			// Better shooting in the ASG, why not?
			if (this.allStarGame) {
				probMake += 0.02;
			}
		} else {
			const r1 =
				0.8 *
				Math.random() *
				this.team[this.o].player[p].compositeRating.shootingMidRange;
			const r2 =
				Math.random() *
				(this.team[this.o].player[p].compositeRating.shootingAtRim +
					this.synergyFactor *
						(this.team[this.o].synergy.off - this.team[this.d].synergy.def)); // Synergy makes easy shots either more likely or less likely

			const r3 =
				Math.random() *
				(this.team[this.o].player[p].compositeRating.shootingLowPost +
					this.synergyFactor *
						(this.team[this.o].synergy.off - this.team[this.d].synergy.def)); // Synergy makes easy shots either more likely or less likely

			if (r1 > r2 && r1 > r3) {
				// Two point jumper
				type = "midRange";
				probMissAndFoul = 0.07;
				probMake =
					this.team[this.o].player[p].compositeRating.shootingMidRange * 0.32 +
					0.35;
				probAndOne = 0.05;
			} else if (r2 > r3) {
				// Dunk, fast break or half court
				type = "atRim";
				probMissAndFoul = 0.37;
				probMake =
					this.team[this.o].player[p].compositeRating.shootingAtRim * 0.32 +
					0.55;
				probAndOne = 0.25;
			} else {
				// Post up
				type = "lowPost";
				probMissAndFoul = 0.33;
				probMake =
					this.team[this.o].player[p].compositeRating.shootingLowPost * 0.32 +
					0.42;
				probAndOne = 0.15;
			}

			// Better shooting in the ASG, why not?
			if (this.allStarGame) {
				probMake += 0.1;
			}
		}

		let foulFactor =
			0.65 *
			(this.team[this.o].player[p].compositeRating.drawingFouls / 0.5) ** 2 *
			g.get("foulRateFactor");

		if (this.allStarGame) {
			foulFactor *= 0.4;
		}

		probMissAndFoul *= foulFactor;
		probAndOne *= foulFactor;
		probMake =
			(probMake -
				0.25 * this.team[this.d].compositeRating.defense +
				this.synergyFactor *
					(this.team[this.o].synergy.off - this.team[this.d].synergy.def)) *
			currentFatigue;

		// Adjust probMake for end of quarter situations, where shot quality will be lower without much time

		if (this.t === 0 && possessionLength < 6 / 60) {
			probMake *= Math.sqrt(possessionLength / (8 / 60));
		}

		// Assisted shots are easier
		if (passer !== undefined) {
			probMake += 0.025;
		}

		if (this.probBlk() > Math.random()) {
			return this.doBlk(shooter, type); // orb or drb
		}

		// Make
		if (probMake > Math.random()) {
			// And 1
			if (probAndOne > Math.random()) {
				return this.doFg(shooter, passer, type, true); // fg, orb, or drb
			}

			return this.doFg(shooter, passer, type); // fg
		}

		// Miss, but fouled
		if (probMissAndFoul > Math.random()) {
			this.doPf(this.d, shooter);

			if (type === "threePointer") {
				return this.doFt(shooter, 3); // fg, orb, or drb
			}

			return this.doFt(shooter, 2); // fg, orb, or drb
		}

		// Miss
		this.recordStat(this.o, p, "fga");

		if (type === "atRim") {
			this.recordStat(this.o, p, "fgaAtRim");
			this.recordPlay("missAtRim", this.o, [this.team[this.o].player[p].name]);
		} else if (type === "lowPost") {
			this.recordStat(this.o, p, "fgaLowPost");
			this.recordPlay("missLowPost", this.o, [
				this.team[this.o].player[p].name,
			]);
		} else if (type === "midRange") {
			this.recordStat(this.o, p, "fgaMidRange");
			this.recordPlay("missMidRange", this.o, [
				this.team[this.o].player[p].name,
			]);
		} else if (type === "threePointer") {
			this.recordStat(this.o, p, "tpa");
			this.recordPlay("missTp", this.o, [this.team[this.o].player[p].name]);
		}

		if (this.t > 0.5 / 60) {
			return this.doReb(); // orb or drb
		}

		return "endOfQuarter";
	}

	/**
	 * Probability that a shot taken this possession is blocked.
	 *
	 * @return {number} Probability from 0 to 1.
	 */
	probBlk() {
		return 0.2 * this.team[this.d].compositeRating.blocking ** 2;
	}

	/**
	 * Blocked shot.
	 *
	 * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the shooting player.
	 * @return {string} Output of this.doReb.
	 */
	doBlk(shooter: PlayerNumOnCourt, type: ShotType) {
		const p = this.playersOnCourt[this.o][shooter];
		this.recordStat(this.o, p, "ba");
		this.recordStat(this.o, p, "fga");

		if (type === "atRim") {
			this.recordStat(this.o, p, "fgaAtRim");
		} else if (type === "lowPost") {
			this.recordStat(this.o, p, "fgaLowPost");
		} else if (type === "midRange") {
			this.recordStat(this.o, p, "fgaMidRange");
		} else if (type === "threePointer") {
			this.recordStat(this.o, p, "tpa");
		}

		const ratios = this.ratingArray("blocking", this.d, 10);
		const p2 = this.playersOnCourt[this.d][pickPlayer(ratios)];
		this.recordStat(this.d, p2, "blk");

		if (type === "atRim") {
			this.recordPlay("blkAtRim", this.d, [
				this.team[this.d].player[p2].name,
				this.team[this.o].player[p].name,
			]);
		} else if (type === "lowPost") {
			this.recordPlay("blkLowPost", this.d, [
				this.team[this.d].player[p2].name,
				this.team[this.o].player[p].name,
			]);
		} else if (type === "midRange") {
			this.recordPlay("blkMidRange", this.d, [
				this.team[this.d].player[p2].name,
				this.team[this.o].player[p].name,
			]);
		} else if (type === "threePointer") {
			this.recordPlay("blkTp", this.d, [
				this.team[this.d].player[p2].name,
				this.team[this.o].player[p].name,
			]);
		}

		return this.doReb(); // orb or drb
	}

	/**
	 * Field goal.
	 *
	 * Simulate a successful made field goal.
	 *
	 * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the shooting player.
	 * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the passing player, who will get an assist. -1 if no assist.
	 * @param {number} type 2 for a two pointer, 3 for a three pointer.
	 * @return {string} fg, orb, or drb (latter two are for and ones)
	 */
	doFg(
		shooter: PlayerNumOnCourt,
		passer: PlayerNumOnCourt | undefined,
		type: ShotType,
		andOne: boolean = false,
	) {
		const p = this.playersOnCourt[this.o][shooter];
		this.recordStat(this.o, p, "fga");
		this.recordStat(this.o, p, "fg");
		this.recordStat(this.o, p, "pts", 2); // 2 points for 2's

		if (type === "atRim") {
			this.recordStat(this.o, p, "fgaAtRim");
			this.recordStat(this.o, p, "fgAtRim");
			this.recordPlay(andOne ? "fgAtRimAndOne" : "fgAtRim", this.o, [
				this.team[this.o].player[p].name,
			]);
		} else if (type === "lowPost") {
			this.recordStat(this.o, p, "fgaLowPost");
			this.recordStat(this.o, p, "fgLowPost");
			this.recordPlay(andOne ? "fgLowPostAndOne" : "fgLowPost", this.o, [
				this.team[this.o].player[p].name,
			]);
		} else if (type === "midRange") {
			this.recordStat(this.o, p, "fgaMidRange");
			this.recordStat(this.o, p, "fgMidRange");
			this.recordPlay(andOne ? "fgMidRangeAndOne" : "fgMidRange", this.o, [
				this.team[this.o].player[p].name,
			]);
		} else if (type === "threePointer") {
			this.recordStat(this.o, p, "pts"); // Extra point for 3's

			this.recordStat(this.o, p, "tpa");
			this.recordStat(this.o, p, "tp");
			this.recordPlay(andOne ? "tpAndOne" : "tp", this.o, [
				this.team[this.o].player[p].name,
			]);
		}

		this.recordLastScore(this.o, p, type, this.t);

		if (passer !== undefined) {
			const p2 = this.playersOnCourt[this.o][passer];
			this.recordStat(this.o, p2, "ast");
			this.recordPlay("ast", this.o, [this.team[this.o].player[p2].name]);
		}

		if (andOne) {
			this.doPf(this.d, shooter);
			return this.doFt(shooter, 1); // fg, orb, or drb
		}

		return "fg";
	}
	/**
	 * Probability that a shot taken this possession is assisted.
	 *
	 * @return {number} Probability from 0 to 1.
	 */

	probAst() {
		return (
			(0.6 * (2 + this.team[this.o].compositeRating.passing)) /
			(2 + this.team[this.d].compositeRating.defense)
		);
	}

	checkGameTyingShot() {
		if (this.lastScoringPlay.length === 0) {
			return;
		}

		// can assume that the last scoring play tied the game
		const i = this.lastScoringPlay.length - 1;
		const play = this.lastScoringPlay[i];
		let shotType = "a basket";

		switch (play.type) {
			case "atRim":
			case "lowPost":
			case "midRange":
				break;

			case "threePointer":
				shotType = "a three-pointer";
				break;

			case "ft":
				shotType = "a free throw";

				if (i > 0) {
					const prevPlay = this.lastScoringPlay[i - 1];

					if (prevPlay.team === play.team) {
						switch (prevPlay.type) {
							case "atRim":
							case "lowPost":
							case "midRange":
								shotType = "a three-point play";
								break;

							case "threePointer":
								shotType = "a four-point play";
								break;

							case "ft":
								if (
									i > 1 &&
									this.lastScoringPlay[i - 2].team === play.team &&
									this.lastScoringPlay[i - 2].type === "ft"
								) {
									shotType = "three free throws";
								} else {
									shotType = "two free throws";
								}

								break;

							default:
						}
					}
				}

				break;

			default:
		}

		const team = this.team[play.team];
		const player = this.team[play.team].player[play.player];
		let eventText = `<a href="${helpers.leagueUrl(["player", player.id])}">${
			player.name
		}</a> made ${shotType}`;

		if (play.time > 0) {
			eventText += ` with ${play.time} seconds remaining`;
		} else {
			eventText +=
				play.type === "ft" ? " with no time on the clock" : " at the buzzer";
		}

		eventText += ` to force ${helpers.overtimeCounter(
			this.team[0].stat.ptsQtrs.length - 3,
		)} overtime`;
		this.clutchPlays.push({
			text: eventText,
			showNotification: team.id === g.get("userTid"),
			pids: [player.id],
			tids: [team.id],
		});
	}

	checkGameWinner() {
		if (this.lastScoringPlay.length === 0) {
			return;
		}

		const winner = this.team[0].stat.pts > this.team[1].stat.pts ? 0 : 1;
		const loser = winner === 0 ? 1 : 0;
		let margin = this.team[winner].stat.pts - this.team[loser].stat.pts;

		// work backwards from last scoring plays, check if any resulted in a tie-break or lead change
		let pts = 0;
		let shotType = "basket";
		for (let i = this.lastScoringPlay.length - 1; i >= 0; i--) {
			const play = this.lastScoringPlay[i];

			switch (play.type) {
				case "atRim":
				case "lowPost":
				case "midRange":
					pts = 2;
					break;

				case "threePointer":
					shotType = "three-pointer";
					pts = 3;
					break;

				case "ft":
					// Special handling for free throws
					shotType = "free throw";

					if (i > 0) {
						const prevPlay = this.lastScoringPlay[i - 1];

						if (prevPlay.team === play.team) {
							switch (prevPlay.type) {
								// cases where the basket ties the game, and the and-one wins it
								case "atRim":
								case "lowPost":
								case "midRange":
									shotType = "three-point play";
									break;

								case "threePointer":
									shotType = "four-point play";
									break;

								default:
							}
						}
					}

					pts = 1;
					break;

				default:
			}

			margin -= play.team === winner ? pts : -pts;

			if (margin <= 0) {
				const team = this.team[play.team];
				const player = this.team[play.team].player[play.player];
				let eventText = `<a href="${helpers.leagueUrl([
					"player",
					player.id,
				])}">${player.name}</a> made a game-winning ${shotType}`;

				if (play.time > 0) {
					eventText += ` with ${play.time} seconds remaining`;
				} else {
					eventText +=
						play.type === "ft"
							? " with no time on the clock"
							: " at the buzzer";
				}

				this.clutchPlays.push({
					text: eventText,
					showNotification: team.id === g.get("userTid"),
					pids: [player.id],
					tids: [team.id],
				});
				return;
			}
		}
	}

	recordLastScore(
		teamnum: TeamNum,
		playernum: number,
		type: ShotType,
		time: number,
	) {
		// only record plays in the fourth quarter or overtime...
		if (this.team[0].stat.ptsQtrs.length < 4) {
			return;
		}

		// ...in the last 24 seconds...
		if (time > 0.4) {
			return;
		}

		// ...when the lead is 3 or less
		if (Math.abs(this.team[0].stat.pts - this.team[1].stat.pts) > 4) {
			return;
		}

		const currPlay = {
			team: teamnum,
			player: playernum,
			type,
			time: Math.floor(time * 600) / 10, // up to 0.1 of a second
		};

		if (this.lastScoringPlay.length === 0) {
			this.lastScoringPlay.push(currPlay);
		} else {
			const lastPlay = this.lastScoringPlay[0];

			if (lastPlay.time !== currPlay.time) {
				this.lastScoringPlay = [];
			}

			this.lastScoringPlay.push(currPlay);
		}
	}

	/**
	 * Free throw.
	 *
	 * Fatigue has no affect: https://doi.org/10.2478/v10078-010-0019-0
	 *
	 * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the shooting player.
	 * @param {number} amount Integer representing the number of free throws to shoot
	 * @return {string} "fg" if the last free throw is made; otherwise, this.doReb is called and its output is returned.
	 */
	doFt(shooter: PlayerNumOnCourt, amount: number) {
		const p = this.playersOnCourt[this.o][shooter]; // 95% max, a 75 FT rating gets you 90%, and a 25 FT rating gets you 60%

		const ftp = helpers.bound(
			this.team[this.o].player[p].compositeRating.shootingFT * 0.6 + 0.45,
			0,
			0.95,
		);
		let outcome: string | null = null;

		for (let i = 0; i < amount; i++) {
			this.recordStat(this.o, p, "fta");

			if (Math.random() < ftp) {
				// Between 60% and 90%
				this.recordStat(this.o, p, "ft");
				this.recordStat(this.o, p, "pts");
				this.recordPlay("ft", this.o, [this.team[this.o].player[p].name]);
				outcome = "fg";
				this.recordLastScore(this.o, p, "ft", this.t);
			} else {
				this.recordPlay("missFt", this.o, [this.team[this.o].player[p].name]);
				outcome = null;
			}
		}

		if (outcome !== "fg") {
			outcome = this.doReb(); // orb or drb
		}

		return outcome;
	}

	/**
	 * Personal foul.
	 *
	 * @param {number} t Team (0 or 1, this.o or this.d).
	 */
	doPf(t: TeamNum, shooter?: PlayerNumOnCourt) {
		const ratios = this.ratingArray("fouling", t);
		const p = this.playersOnCourt[t][pickPlayer(ratios)];
		this.recordStat(this.d, p, "pf");
		this.recordPlay("pf", this.d, [this.team[this.d].player[p].name]); // Foul out

		if (
			g.get("foulsNeededToFoulOut") > 0 &&
			this.team[this.d].player[p].stat.pf >= g.get("foulsNeededToFoulOut")
		) {
			this.recordPlay("foulOut", this.d, [this.team[this.d].player[p].name]); // Force substitutions now

			this.updatePlayersOnCourt(shooter);
			this.updateSynergy();
		}

		this.foulsThisQuarter[t] += 1;

		if (this.t <= 2) {
			this.foulsLastTwoMinutes[t] += 1;
		}
	}

	/**
	 * Rebound.
	 *
	 * Simulates a rebound opportunity (e.g. after a missed shot).
	 *
	 * @return {string} "drb" for a defensive rebound, "orb" for an offensive rebound, null for no rebound (like if the ball goes out of bounds).
	 */
	doReb() {
		let p;
		let ratios;

		if (Math.random() < 0.15) {
			return null;
		}

		if (
			(0.75 * (2 + this.team[this.d].compositeRating.rebounding)) /
				(2 + this.team[this.o].compositeRating.rebounding) >
			Math.random()
		) {
			ratios = this.ratingArray("rebounding", this.d, 3);
			p = this.playersOnCourt[this.d][pickPlayer(ratios)];
			this.recordStat(this.d, p, "drb");
			this.recordPlay("drb", this.d, [this.team[this.d].player[p].name]);
			return "drb";
		}

		ratios = this.ratingArray("rebounding", this.o, 5);
		p = this.playersOnCourt[this.o][pickPlayer(ratios)];
		this.recordStat(this.o, p, "orb");
		this.recordPlay("orb", this.o, [this.team[this.o].player[p].name]);
		return "orb";
	}

	/**
	 * Generate an array of composite ratings.
	 *
	 * @param {string} rating Key of this.team[t].player[p].compositeRating to use.
	 * @param {number} t Team (0 or 1, this.or or this.d).
	 * @param {number=} power Power that the composite rating is raised to after the components are linearly combined by  the weights and scaled from 0 to 1. This can be used to introduce nonlinearities, like making a certain stat more uniform (power < 1) or more unevenly distributed (power > 1) or making a composite rating an inverse (power = -1). Default value is 1.
	 * @return {Array.<number>} Array of composite ratings of the players on the court for the given rating and team.
	 */
	ratingArray(rating: CompositeRating, t: TeamNum, power: number = 1) {
		const array: [number, number, number, number, number] = [0, 0, 0, 0, 0];
		let total = 0;

		// Scale composite ratings
		for (let i = 0; i < 5; i++) {
			const p = this.playersOnCourt[t][i];
			array[i] =
				(this.team[t].player[p].compositeRating[rating] *
					fatigue(this.team[t].player[p].stat.energy)) **
				power;
			total += array[i];
		}

		// Set floor (5% of total)
		const floor = 0.05 * total;

		for (let i = 0; i < 5; i++) {
			if (array[i] < floor) {
				array[i] = floor;
			}
		}

		return array;
	}

	/**
	 * Increments a stat (s) for a player (p) on a team (t) by amount (default is 1).
	 *
	 * @param {number} t Team (0 or 1, this.or or this.d).
	 * @param {number} p Integer index of this.team[t].player for the player of interest.
	 * @param {string} s Key for the property of this.team[t].player[p].stat to increment.
	 * @param {number} amt Amount to increment (default is 1).
	 */
	recordStat(t: TeamNum, p: number, s: Stat, amt: number = 1) {
		this.team[t].player[p].stat[s] += amt;

		if (
			s !== "gs" &&
			s !== "courtTime" &&
			s !== "benchTime" &&
			s !== "energy"
		) {
			this.team[t].stat[s] += amt; // Record quarter-by-quarter scoring too

			if (s === "pts") {
				this.team[t].stat.ptsQtrs[this.team[t].stat.ptsQtrs.length - 1] += amt;

				for (let i = 0; i < 2; i++) {
					for (let j = 0; j < 5; j++) {
						const k = this.playersOnCourt[i][j];
						this.team[i].player[k].stat.pm += i === t ? amt : -amt;
					}
				}
			}

			if (this.playByPlay !== undefined) {
				this.playByPlay.push({
					type: "stat",
					qtr: this.team[t].stat.ptsQtrs.length - 1,
					t,
					p,
					s,
					amt,
				});
			}
		}
	}

	recordPlay(type: PlayType, t?: TeamNum, names?: string[]) {
		let texts;
		if (this.playByPlay !== undefined) {
			if (type === "injury") {
				texts = ["{0} was injured!"];
			} else if (type === "tov") {
				texts = ["{0} turned the ball over"];
			} else if (type === "stl") {
				texts = ["{0} stole the ball from {1}"];
			} else if (type === "fgAtRim") {
				texts = ["{0} made a layup", "{0} made a dunk"];
			} else if (type === "fgAtRimAndOne") {
				texts = [
					"{0} made a layup and got fouled!",
					"{0} made a dunk and got fouled!",
				];
			} else if (type === "fgLowPost") {
				texts = ["{0} made a low post shot"];
			} else if (type === "fgLowPostAndOne") {
				texts = ["{0} made a low post shot and got fouled!"];
			} else if (type === "fgMidRange") {
				texts = ["{0} made a mid-range shot"];
			} else if (type === "fgMidRangeAndOne") {
				texts = ["{0} made a mid-range shot and got fouled!"];
			} else if (type === "tp") {
				texts = ["{0} made a three pointer"];
			} else if (type === "tpAndOne") {
				texts = ["{0} made a three pointer and got fouled!"];
			} else if (type === "blkAtRim") {
				texts = [
					"{0} blocked {1}'s layup attempt",
					"{0} blocked {1}'s dunk attempt",
				];
			} else if (type === "blkLowPost") {
				texts = ["{0} blocked {1}'s low post shot"];
			} else if (type === "blkMidRange") {
				texts = ["{0} blocked {1}'s mid-range shot"];
			} else if (type === "blkTp") {
				texts = ["{0} blocked {1}'s three pointer"];
			} else if (type === "missAtRim") {
				texts = ["{0} missed a layup", "{0} missed a dunk"];
			} else if (type === "missLowPost") {
				texts = ["{0} missed a low post shot"];
			} else if (type === "missMidRange") {
				texts = ["{0} missed a mid-range shot"];
			} else if (type === "missTp") {
				texts = ["{0} missed a three pointer"];
			} else if (type === "orb") {
				texts = ["{0} grabbed the offensive rebound"];
			} else if (type === "drb") {
				texts = ["{0} grabbed the defensive rebound"];
			} else if (type === "ast") {
				texts = ["(assist: {0})"];
			} else if (type === "quarter") {
				texts = [
					`Start of ${helpers.ordinal(
						this.team[0].stat.ptsQtrs.length,
					)} quarter`,
				];
			} else if (type === "overtime") {
				texts = [
					`Start of ${helpers.ordinal(
						this.team[0].stat.ptsQtrs.length - 4,
					)} overtime period`,
				];
			} else if (type === "gameOver") {
				texts = ["End of game"];
			} else if (type === "ft") {
				texts = ["{0} made a free throw"];
			} else if (type === "missFt") {
				texts = ["{0} missed a free throw"];
			} else if (type === "pf") {
				texts = ["Foul on {0}"];
			} else if (type === "foulOut") {
				texts = ["{0} fouled out"];
			} else if (type === "sub") {
				texts = ["Substitution: {0} for {1}"];
			} else if (type === "jumpBall") {
				texts = ["{0} won the jump ball"];
			}

			if (texts) {
				let text = random.choice(texts);

				if (names) {
					for (let i = 0; i < names.length; i++) {
						text = text.replace(`{${i}}`, names[i]);
					}
				}

				if (type === "ast") {
					// Find most recent made shot, count assist for it
					for (let i = this.playByPlay.length - 1; i >= 0; i--) {
						if (this.playByPlay[i].type === "text") {
							this.playByPlay[i].text += ` ${text}`;
							break;
						}
					}
				} else {
					const sec = Math.floor((this.t % 1) * 60);
					const secString = sec < 10 ? `0${sec}` : `${sec}`;

					this.playByPlay.push({
						type: "text",
						text,
						t,
						time: `${Math.floor(this.t)}:${secString}`,
					});
				}
			} else {
				throw new Error(`No text for ${type}`);
			}
		}
	}
}

export default GameSim;
