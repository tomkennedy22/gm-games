import { PHASE, PLAYER } from "../../../common";
import addStatsRow from "./addStatsRow";
import develop, { bootstrapPot } from "./develop";
import genContract from "./genContract";
import generate from "./generate";
import setContract from "./setContract";
import skills from "./skills";
import updateValues from "./updateValues";
import { g, overrides, random } from "../../util";
import type { MinimalPlayerRatings, Player } from "../../../common/types";

/**
 * Take a partial player object, such as from an uploaded JSON file, and add everything it needs to be a real player object.
 *
 * @memberOf core.player
 * @param {Object} p Partial player object.
 * @return {Object} p Full player object.
 */
const augmentPartialPlayer = (
	p: any,
	scoutingRank: number,
	version: number | undefined,
): Player<MinimalPlayerRatings> => {
	let age;

	if (!p.hasOwnProperty("born")) {
		age = random.randInt(19, 35);
	} else {
		age = g.get("startingSeason") - p.born.year;
	}

	if (
		p.hasOwnProperty("name") &&
		!p.hasOwnProperty("firstName") &&
		!p.hasOwnProperty("lastName")
	) {
		// parse and split names from roster file
		p.firstName = p.name.split(" ")[0];
		p.lastName = p.name.split(" ").slice(1, p.name.split(" ").length).join(" ");
	}

	// This is used to get at default values for various attributes
	const pg = generate(
		p.tid,
		age,
		g.get("startingSeason") - (age - 18),
		true,
		scoutingRank,
	);

	// Optional things
	const simpleDefaults = [
		"awards",
		"born",
		"college",
		"face",
		"firstName",
		"freeAgentMood",
		"gamesUntilTradable",
		"hgt",
		"hof",
		"imgURL",
		"injury",
		"injuries",
		"lastName",
		"ptModifier",
		"retiredYear",
		"rosterOrder",
		"watch",
		"weight",
		"yearsFreeAgent",
	] as (keyof typeof pg)[];

	for (let i = 0; i < simpleDefaults.length; i++) {
		if (!p.hasOwnProperty(simpleDefaults[i])) {
			p[simpleDefaults[i]] = pg[simpleDefaults[i]];
		}
	}

	if (p.retiredYear === null) {
		// Because JSON turns Infinity to null
		p.retiredYear = Infinity;
	}

	if (!p.hasOwnProperty("stats")) {
		p.stats = [];
	}

	if (!p.hasOwnProperty("statsTids")) {
		p.statsTids = Array.isArray(p.stats) ? p.stats.map((s: any) => s.tid) : [];

		if (p.tid >= 0 && g.get("phase") <= PHASE.PLAYOFFS) {
			p.statsTids.push(p.tid);
		}

		p.statsTids = Array.from(new Set(p.statsTids));
	}

	if (!p.hasOwnProperty("draft")) {
		p.draft = {};
	}

	if (typeof p.draft.year !== "number") {
		if (p.tid === PLAYER.UNDRAFTED) {
			p.draft.year = g.get("season");
		} else {
			p.draft.year = pg.draft.year;
		}
	}

	if (typeof p.draft.tid !== "number") {
		p.draft.tid = -1;
	}

	if (typeof p.draft.originalTid !== "number") {
		p.draft.originalTid = p.draft.tid;
	}

	if (typeof p.draft.round !== "number") {
		p.draft.round = 0;
	}

	if (typeof p.draft.pick !== "number") {
		p.draft.pick = 0;
	}

	if (typeof p.draft.pot !== "number") {
		p.draft.pot = 0;
	}

	if (typeof p.draft.ovr !== "number") {
		p.draft.ovr = 0;
	}

	// Fix always-missing info
	const offset = g.get("phase") >= PHASE.RESIGN_PLAYERS ? 1 : 0;

	if (p.tid === PLAYER.UNDRAFTED && g.get("phase") !== PHASE.FANTASY_DRAFT) {
		if (version === undefined || version <= 32) {
			p.ratings[0].season = g.get("season") + offset;
			p.draft.year = p.ratings[0].season;
		} else {
			p.ratings[0].season = p.draft.year;
		}
	} else if (p.tid === PLAYER.UNDRAFTED_2) {
		if (version === undefined || version <= 32) {
			p.tid = PLAYER.UNDRAFTED;
			p.ratings[0].season = g.get("season") + 1 + offset;
			p.draft.year = p.ratings[0].season;
		} else {
			throw new Error(
				`Invalid tid ${PLAYER.UNDRAFTED_2} (in version 33 or higher, all undrafted players should have a tid of ${PLAYER.UNDRAFTED})`,
			);
		}
	} else if (p.tid === PLAYER.UNDRAFTED_3) {
		if (version === undefined || version <= 32) {
			p.tid = PLAYER.UNDRAFTED;
			p.ratings[0].season = g.get("season") + 2 + offset;
			p.draft.year = p.ratings[0].season;
		} else {
			throw new Error(
				`Invalid tid ${PLAYER.UNDRAFTED_3} (in version 33 or higher, all undrafted players should have a tid of ${PLAYER.UNDRAFTED})`,
			);
		}
	} else if (p.tid === PLAYER.RETIRED) {
		for (const r of p.ratings) {
			if (!r.hasOwnProperty("season")) {
				r.season =
					typeof p.retiredYear === "number" ? p.retiredYear : g.get("season");
			}
		}
	} else if (g.get("phase") !== PHASE.FANTASY_DRAFT) {
		if (!p.ratings[0].hasOwnProperty("season")) {
			p.ratings[0].season = g.get("season");
		}

		// Fix improperly-set season in ratings
		if (
			p.ratings.length === 1 &&
			p.ratings[0].season < g.get("season") &&
			p.tid !== PLAYER.RETIRED
		) {
			p.ratings[0].season = g.get("season");
		}
	}

	if (!Array.isArray(p.draft.skills)) {
		p.draft.skills = [];
	}

	// Height rescaling
	if (version === undefined || version <= 23) {
		for (const r of p.ratings) {
			r.hgt = overrides.core.player.heightToRating!(p.hgt);
		}
	}

	const r2 = p.ratings[p.ratings.length - 1];

	if (process.env.SPORT === "football" && (!r2.ovrs || !r2.pots || !r2.pos)) {
		// Kind of hacky... impose ovrs/pots, but only for latest season. This will also overwrite ovr, pot, and skills
		develop(p, 0);
	}

	// Rating rescaling
	if (
		process.env.SPORT === "basketball" &&
		(version === undefined || version <= 26)
	) {
		for (const r of p.ratings) {
			// Replace blk/stl with diq
			if (typeof r.diq !== "number") {
				if (typeof r.blk === "number" && typeof r.stl === "number") {
					r.diq = Math.round((r.blk + r.stl) / 2);
					delete r.blk;
					delete r.stl;
				} else {
					r.diq = 50;
				}
			}

			// Add oiq
			if (typeof r.oiq !== "number") {
				r.oiq = Math.round((r.drb + r.pss + r.tp + r.ins) / 4);

				if (typeof r.oiq !== "number") {
					r.oiq = 50;
				}
			}

			// Scale ratings
			const ratingKeys = [
				"stre",
				"spd",
				"jmp",
				"endu",
				"ins",
				"dnk",
				"ft",
				"fg",
				"tp",
				"oiq",
				"diq",
				"drb",
				"pss",
				"reb",
			];

			for (const key of ratingKeys) {
				if (typeof r[key] === "number") {
					// 100 -> 80
					// 0 -> 20
					// Linear in between
					r[key] -= (20 * (r[key] - 50)) / 50;
				} else {
					console.log(p);
					throw new Error(`Missing rating: ${key}`);
				}
			}

			r.ovr = overrides.core.player.ovr!(r);
			r.skills = skills(r);
			r.pot = bootstrapPot(r, r.season - p.born.year);

			if (p.draft.year === r.season) {
				p.draft.ovr = r.ovr;
				p.draft.skills = r.skills;
				p.draft.pot = r.pot;
			}
		}
	}

	// Handle old format position
	if (p.hasOwnProperty("pos")) {
		for (let i = 0; i < p.ratings.length; i++) {
			if (!p.ratings[i].hasOwnProperty("pos")) {
				p.ratings[i].pos = p.pos;
			}
		}
	}

	for (const r of p.ratings) {
		if (!r.hasOwnProperty("fuzz")) {
			r.fuzz = pg.ratings[0].fuzz;
		}

		if (!r.hasOwnProperty("skills")) {
			r.skills = skills(p.ratings[0]);
		}

		if (!r.hasOwnProperty("ovr")) {
			r.ovr = overrides.core.player.ovr!(p.ratings[0]);
		}

		if (
			process.env.SPORT === "basketball" &&
			(!r.hasOwnProperty("pot") || r.pot < r.ovr)
		) {
			// Only basketball, in case position is not known at this point
			r.pot = bootstrapPot(r, r.season - p.born.year);
		}

		if (!r.hasOwnProperty("pos") && process.env.SPORT !== "football") {
			// Football is handled below with call to player.develop
			if (p.hasOwnProperty("pos") && typeof p.pos === "string") {
				r.pos = p.pos;
			} else {
				r.pos = overrides.core.player.pos!(r);
			}
		}
	}

	// Don't delete p.pos because it is used as a marker that this is from a league file and we shouldn't automatically change pos over time
	updateValues(p);

	if (!p.hasOwnProperty("salaries")) {
		p.salaries = [];
	}

	if (!p.hasOwnProperty("contract")) {
		setContract(p, genContract(p, true), p.tid >= 0);
	} else {
		// Don't let imported contracts be created for below the league minimum, and round to nearest $10,000.
		p.contract.amount = Math.max(
			10 * Math.round(p.contract.amount / 10),
			g.get("minContract"),
		);

		if (p.contract.exp < g.get("startingSeason")) {
			p.contract.exp = g.get("startingSeason");
		}

		if (p.tid >= 0 && p.salaries.length === 0) {
			setContract(p, p.contract, true);
		}
	}

	// If no stats in League File, create blank stats rows for active players if necessary
	if (!Array.isArray(p.stats)) {
		p.stats = [];
	}

	if (p.stats.length === 0) {
		if (p.tid >= 0 && g.get("phase") <= PHASE.PLAYOFFS) {
			addStatsRow(p, g.get("phase") === PHASE.PLAYOFFS);
		}
	} else {
		const statKeys = [
			...overrides.core.player.stats!.derived,
			...overrides.core.player.stats!.raw,
		];

		for (const ps of p.stats) {
			// Could be calculated correctly if I wasn't lazy
			if (!ps.hasOwnProperty("yearsWithTeam")) {
				ps.yearsWithTeam = 1;
			}

			// If needed, set missing +/-, blocks against to 0
			if (!ps.hasOwnProperty("ba")) {
				ps.ba = 0;
			}

			if (!ps.hasOwnProperty("pm")) {
				ps.pm = 0;
			}

			// Handle any missing stats
			for (const key of statKeys) {
				if (!ps.hasOwnProperty(key)) {
					ps[key] = 0;
				}
			}
		}

		// Add stats row if this is the preseason and all stats are historical, mostly for people making rosters by hand
		if (g.get("phase") === PHASE.PRESEASON) {
			const lastSeason = p.stats[p.stats.length - 1].season;

			if (p.tid >= 0 && lastSeason < g.get("season")) {
				addStatsRow(p, false);
			}
		}
	}

	if (!Array.isArray(p.relatives)) {
		p.relatives = [];
	}

	return p;
};

export default augmentPartialPlayer;
