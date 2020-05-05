import PropTypes from "prop-types";
import React from "react";
import { DataTable, PlayerNameLabels } from "../components";
import useTitleBar from "../hooks/useTitleBar";
import { getCols, helpers } from "../util";
import type { View } from "../../common/types";

const PlayerStats = ({
	abbrev,
	players,
	playoffs,
	season,
	statType,
	stats,
	superCols,
	userTid,
}: View<"playerStats">) => {
	useTitleBar({
		title: "Player Stats",
		jumpTo: true,
		jumpToSeason: season,
		dropdownView: "player_stats",
		dropdownFields: {
			teamsAndAllWatch: abbrev,
			seasonsAndCareer: season === undefined ? "career" : season,
			statTypesAdv: statType,
			playoffs,
		},
	});

	const cols = getCols(
		"Name",
		"Pos",
		"Age",
		"Team",
		...stats.map(stat => `stat:${stat}`),
	);

	if (statType === "shotLocations") {
		cols[cols.length - 3].title = "M";
		cols[cols.length - 2].title = "A";
		cols[cols.length - 1].title = "%";
	}

	let sortCol = cols.length - 1;
	if (process.env.SPORT === "football") {
		if (statType === "passing") {
			sortCol = 9;
		} else if (statType === "rushing") {
			sortCol = cols.length - 3;
		} else if (statType === "defense") {
			sortCol = 16;
		} else if (statType === "kicking") {
			sortCol = cols.length - 11;
		} else if (statType === "returns") {
			sortCol = 12;
		}
	}

	const rows = players.map(p => {
		let pos;
		if (Array.isArray(p.ratings) && p.ratings.length > 0) {
			pos = p.ratings[p.ratings.length - 1].pos;
		} else if (p.ratings.pos) {
			pos = p.ratings.pos;
		} else {
			pos = "?";
		}

		// HACKS to show right stats, info
		let actualAbbrev;
		let actualTid;
		if (season === undefined) {
			p.stats = p.careerStats;
			actualAbbrev = p.abbrev;
			actualTid = p.tid;
			if (playoffs === "playoffs") {
				p.stats = p.careerStatsPlayoffs;
			}
		} else {
			actualAbbrev = p.stats.abbrev;
			actualTid = p.stats.tid;
		}

		const statsRow = stats.map(stat =>
			helpers.roundStat(p.stats[stat], stat, statType === "totals"),
		);

		return {
			key: p.pid,
			data: [
				<PlayerNameLabels
					injury={p.injury}
					pid={p.pid}
					skills={p.ratings.skills}
					watch={p.watch}
				>
					{p.nameAbbrev}
				</PlayerNameLabels>,
				pos,
				p.age,
				<a href={helpers.leagueUrl(["roster", actualAbbrev, season])}>
					{actualAbbrev}
				</a>,
				...statsRow,
			],
			classNames: {
				"table-danger": p.hof,
				"table-info": actualTid === userTid,
			},
		};
	});

	return (
		<>
			<p>
				More:{" "}
				<a
					href={helpers.leagueUrl(
						season === undefined
							? ["player_stat_dists"]
							: ["player_stat_dists", season],
					)}
				>
					Stat Distributions
				</a>
			</p>

			<p>
				Players on your team are{" "}
				<span className="text-info">highlighted in blue</span>. Players in the
				Hall of Fame are <span className="text-danger">highlighted in red</span>
				. Only players averaging more than 5 minutes per game are shown.
			</p>

			<DataTable
				cols={cols}
				defaultSort={[sortCol, "desc"]}
				name={`PlayerStats${statType}`}
				rows={rows}
				superCols={superCols}
				pagination
			/>
		</>
	);
};

PlayerStats.propTypes = {
	abbrev: PropTypes.string.isRequired,
	players: PropTypes.arrayOf(PropTypes.object).isRequired,
	playoffs: PropTypes.oneOf(["playoffs", "regularSeason"]).isRequired,
	season: PropTypes.number, // Undefined for career totals
	statType: PropTypes.oneOf([
		"advanced",
		"per36",
		"perGame",
		"shotLocations",
		"totals",
		"passing",
		"rushing",
		"defense",
		"kicking",
		"returns",
	]).isRequired,
	stats: PropTypes.arrayOf(PropTypes.string).isRequired,
	superCols: PropTypes.array,
	userTid: PropTypes.number,
};

export default PlayerStats;
