import { idb } from "../../../deion/worker/db";
import { g } from "../../../deion/worker/util";
import getDepthPlayers from "../core/player/getDepthPlayers";
import posRatings from "../../common/posRatings";
import type { UpdateEvents, ViewInput } from "../../../deion/common/types";
import type { Position } from "../../common/types";

const defenseStats = [
	"defTckSolo",
	"defTckAst",
	"defTck",
	"defTckLoss",
	"defSk",
	"defSft",
	"defPssDef",
	"defInt",
	"defIntYds",
	"defIntTD",
	"defIntLng",
	"defFmbFrc",
	"defFmbRec",
	"defFmbYds",
	"defFmbTD",
];
const stats: Record<Position, string[]> = {
	QB: [
		"pssCmp",
		"pss",
		"cmpPct",
		"pssYds",
		"pssTD",
		"pssInt",
		"pssSk",
		"pssSkYds",
		"qbRat",
		"fmbLost",
	],
	RB: [
		"rus",
		"rusYds",
		"rusYdsPerAtt",
		"rusLng",
		"rusTD",
		"tgt",
		"rec",
		"recYds",
		"recYdsPerAtt",
		"recTD",
		"recLng",
		"fmbLost",
	],
	WR: ["tgt", "rec", "recYds", "recYdsPerAtt", "recTD", "recLng", "fmbLost"],
	TE: ["tgt", "rec", "recYds", "recYdsPerAtt", "recTD", "recLng", "fmbLost"],
	OL: [],
	DL: defenseStats,
	LB: defenseStats,
	CB: defenseStats,
	S: defenseStats,
	K: ["fg", "fga", "fgPct", "fgLng", "xp", "xpa", "xpPct", "kickingPts"],
	P: ["pnt", "pntYdsPerAtt", "pntIn20", "pntTB", "pntLng", "pntBlk"],
	KR: ["kr", "krYds", "krYdsPerAtt", "krLng", "krTD"],
	PR: ["pr", "prYds", "prYdsPerAtt", "prLng", "prTD"],
};

async function updateDepth(
	{ abbrev, pos, tid }: ViewInput<"depth">,
	updateEvents: UpdateEvents,
	state: any,
) {
	if (
		updateEvents.includes("firstRun") ||
		updateEvents.includes("gameSim") ||
		updateEvents.includes("playerMovement") ||
		pos !== state.pos ||
		abbrev !== state.abbrev
	) {
		const editable = tid === g.get("userTid");
		// @ts-ignore
		const ratings = ["hgt", "stre", "spd", "endu", ...posRatings(pos)];
		const playersAll = await idb.cache.players.indexGetAll("playersByTid", tid);
		const players = await idb.getCopies.playersPlus(playersAll, {
			attrs: ["pid", "name", "age", "injury", "watch"],
			ratings: ["skills", "pos", "ovr", "pot", "ovrs", "pots", ...ratings],
			// @ts-ignore
			stats: stats[pos],
			season: g.get("season"),
			showNoStats: true,
			showRookies: true,
			fuzz: true,
		});

		// Sort players based on current depth chart
		const t = await idb.cache.teams.get(tid);

		if (!t.depth) {
			throw new Error("Missing depth");
		}

		const depthPlayers = getDepthPlayers(t.depth, players);

		// https://github.com/microsoft/TypeScript/issues/21732
		// @ts-ignore
		const stats2: string[] = stats.hasOwnProperty(pos) ? stats[pos] : [];

		const players2: any[] = depthPlayers.hasOwnProperty(pos)
			? // https://github.com/microsoft/TypeScript/issues/21732
			  // @ts-ignore
			  depthPlayers[pos]
			: [];

		return {
			abbrev,
			editable,
			pos,
			players: players2,
			ratings,
			season: g.get("season"),
			stats: stats2,
		};
	}
}

export default updateDepth;
