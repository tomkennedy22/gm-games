import classNames from "classnames";
import PropTypes from "prop-types";
import React from "react";
import { BoxScoreWrapper } from "../components";
import useTitleBar from "../hooks/useTitleBar";
import { helpers, overrides, useLocalShallow } from "../util";
import useClickable from "../hooks/useClickable";
import type { View, Game } from "../../common/types";

const StatsRow = ({ i, p, ...props }: { i: number; p: any }) => {
	const { clicked, toggleClicked } = useClickable();

	const classes = classNames({
		"table-warning": clicked,
	});
	return (
		<overrides.components.BoxScoreRow
			className={classes}
			i={i}
			onClick={toggleClicked}
			p={p}
			{...props}
		/>
	);
};

StatsRow.propTypes = {
	i: PropTypes.number.isRequired,
	p: PropTypes.object.isRequired,
};

const findPrevNextGids = (games: Game[], currentGid: number) => {
	let prevGid;
	let nextGid;
	let currentGidInList = false;

	for (let i = 0; i < games.length; i++) {
		if (games[i].gid === currentGid) {
			currentGidInList = true;
			if (i > 0) {
				nextGid = games[i - 1].gid;
			}
			if (i < games.length - 1) {
				prevGid = games[i + 1].gid;
			}
			break;
		}
	}

	return { currentGidInList, prevGid, nextGid };
};

const GamesList = ({
	abbrev,
	currentSeason,
	gid,
	gamesList,
	season,
	tid,
}: {
	abbrev: string;
	currentSeason: number;
	gamesList: View<"gameLog">["gamesList"];
	gid?: number;
	season: number;
	tid: number;
}) => {
	const { teamAbbrevsCache } = useLocalShallow(state => ({
		teamAbbrevsCache: state.teamAbbrevsCache,
	}));

	if (season < currentSeason && gamesList.games.length === 0) {
		return (
			<p className="alert alert-info">
				No games found for this season. By default, box scores from old seasons
				are automatically deleted after 3 years.{" "}
				<a href={helpers.leagueUrl(["options"])}>
					You can change this behavior on the Options page.
				</a>
			</p>
		);
	}

	return (
		<table className="table table-striped table-bordered table-sm game-log-list">
			<thead>
				<tr>
					<th>Opp</th>
					<th>W/L</th>
					<th>Score</th>
				</tr>
			</thead>
			<tbody>
				{gamesList.abbrev !== abbrev ? (
					<tr>
						<td colSpan={3}>Loading...</td>
					</tr>
				) : (
					gamesList.games.map(gm => {
						const home = gm.teams[0].tid === tid;
						const user = home ? 0 : 1;
						const other = home ? 1 : 0;

						let result;
						if (gm.teams[user].pts > gm.teams[other].pts) {
							result = "W";
						} else if (gm.teams[user].pts < gm.teams[other].pts) {
							result = "L";
						} else {
							result = "T";
						}

						let overtimes;
						if (gm.overtimes !== undefined && gm.overtimes > 0) {
							if (gm.overtimes === 1) {
								overtimes = "OT";
							} else if (gm.overtimes > 1) {
								overtimes = `${gm.overtimes}OT`;
							}
						}

						const oppAbbrev =
							abbrev === "special"
								? "ASG"
								: teamAbbrevsCache[gm.teams[other].tid];

						return (
							<tr
								key={gm.gid}
								className={gm.gid === gid ? "table-info" : undefined}
							>
								<td className="game-log-cell">
									<a
										href={helpers.leagueUrl([
											"game_log",
											abbrev,
											season,
											gm.gid,
										])}
									>
										{home ? "" : "@"}
										{oppAbbrev}
									</a>
								</td>
								<td className="game-log-cell">
									<a
										href={helpers.leagueUrl([
											"game_log",
											abbrev,
											season,
											gm.gid,
										])}
									>
										{result}
									</a>
								</td>
								<td className="game-log-cell">
									<a
										href={helpers.leagueUrl([
											"game_log",
											abbrev,
											season,
											gm.gid,
										])}
									>
										{gm.teams[user].pts}-{gm.teams[other].pts} {overtimes}
									</a>
								</td>
							</tr>
						);
					})
				)}
			</tbody>
		</table>
	);
};

GamesList.propTypes = {
	abbrev: PropTypes.string.isRequired,
	currentSeason: PropTypes.number.isRequired,
	gid: PropTypes.number,
	gamesList: PropTypes.object.isRequired,
	season: PropTypes.number.isRequired,
	tid: PropTypes.number.isRequired,
};

const GameLog = ({
	abbrev,
	boxScore,
	currentSeason,
	gamesList,
	season,
	tid,
}: View<"gameLog">) => {
	useTitleBar({
		title: "Game Log",
		dropdownView: "game_log",
		dropdownFields: {
			[process.env.SPORT === "basketball"
				? "teamsAndSpecial"
				: "teams"]: abbrev,
			seasons: season,
		},
		dropdownExtraParam: boxScore.gid,
	});

	const { currentGidInList, nextGid, prevGid } = findPrevNextGids(
		gamesList.games,
		boxScore.gid,
	);

	return (
		<>
			<p>
				More:{" "}
				{process.env.SPORT === "football" ? (
					<>
						<a href={helpers.leagueUrl(["depth", abbrev])}>Depth Chart</a> |{" "}
					</>
				) : null}
				<a href={helpers.leagueUrl(["roster", abbrev, season])}>Roster</a> |{" "}
				<a href={helpers.leagueUrl(["team_finances", abbrev])}>Finances</a> |{" "}
				<a href={helpers.leagueUrl(["team_history", abbrev])}>History</a> |{" "}
				<a href={helpers.leagueUrl(["transactions", abbrev])}>Transactions</a>
			</p>

			<p />
			<div className="row">
				<div className="col-md-10">
					{boxScore.gid >= 0 ? (
						<BoxScoreWrapper
							abbrev={abbrev}
							boxScore={boxScore}
							currentGidInList={currentGidInList}
							nextGid={nextGid}
							prevGid={prevGid}
							showNextPrev
							Row={StatsRow}
						/>
					) : (
						<p>Select a game from the menu to view a box score.</p>
					)}
				</div>

				<div className="col-md-2">
					<GamesList
						abbrev={abbrev}
						currentSeason={currentSeason}
						gamesList={gamesList}
						gid={boxScore.gid}
						season={season}
						tid={tid}
					/>
				</div>
			</div>
		</>
	);
};

GameLog.propTypes = {
	abbrev: PropTypes.string.isRequired,
	boxScore: PropTypes.object.isRequired,
	currentSeason: PropTypes.number.isRequired,
	gamesList: PropTypes.object.isRequired,
	season: PropTypes.number.isRequired,
	tid: PropTypes.number.isRequired,
};

export default GameLog;
