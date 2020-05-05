import classNames from "classnames";
import PropTypes from "prop-types";
import React, { useState } from "react";
import arrayMove from "array-move";
import { PHASE } from "../../../common";
import {
	HelpPopover,
	PlayerNameLabels,
	RatingWithChange,
	SortableTable,
	SafeHtml,
} from "../../components";
import useTitleBar from "../../hooks/useTitleBar";
import { confirm, getCols, helpers, logEvent, toWorker } from "../../util";
import PlayingTime, { ptStyles } from "./PlayingTime";
import TopStuff from "./TopStuff";
import type { Phase, View } from "../../../common/types";

// If a player was just drafted and the regular season hasn't started, then he can be released without paying anything
const justDrafted = (
	p: View<"roster">["players"][number],
	phase: Phase,
	season: number,
) => {
	return (
		(p.draft.year === season && phase >= PHASE.DRAFT) ||
		(p.draft.year === season - 1 && phase < PHASE.REGULAR_SEASON)
	);
};

const handleRelease = async (
	p: View<"roster">["players"][number],
	phase: Phase,
	season: number,
) => {
	const wasPlayerJustDrafted = justDrafted(p, phase, season);

	let releaseMessage;
	if (wasPlayerJustDrafted) {
		releaseMessage = `Are you sure you want to release ${p.name}?  He will become a free agent and no longer take up a roster spot on your team. Because you just drafted him and the regular season has not started yet, you will not have to pay his contract.`;
	} else {
		releaseMessage = `Are you sure you want to release ${p.name}?  He will become a free agent and no longer take up a roster spot on your team, but you will still have to pay his salary (and have it count against the salary cap) until his contract expires in ${p.contract.exp}.`;
	}

	const proceed = await confirm(releaseMessage, {
		okText: "Release Player",
	});
	if (proceed) {
		const errorMsg = await toWorker(
			"main",
			"releasePlayer",
			p.pid,
			wasPlayerJustDrafted,
		);
		if (errorMsg) {
			logEvent({
				type: "error",
				text: errorMsg,
				saveToDb: false,
			});
		}
	}
};

const Roster = ({
	abbrev,
	budget,
	currentSeason,
	editable,
	maxRosterSize,
	numConfs,
	numPlayoffRounds,
	payroll,
	phase,
	players,
	salaryCap,
	season,
	showRelease,
	showTradeFor,
	stats,
	t,
	userTid,
}: View<"roster">) => {
	const [sortedPids, setSortedPids] = useState<number[] | undefined>(undefined);
	const [prevPlayers, setPrevPlayers] = useState(players);

	useTitleBar({
		title: "Roster",
		dropdownView: "roster",
		dropdownFields: {
			teams: abbrev,
			seasons: season,
		},
		moreInfoAbbrev: abbrev,
		moreInfoSeason: season,
	});

	if (players !== prevPlayers) {
		setSortedPids(undefined);
		setPrevPlayers(players);
	}

	// Use the result of drag and drop to sort players, before the "official" order comes back as props
	let playersSorted: typeof players;
	if (sortedPids !== undefined) {
		playersSorted = sortedPids.map(pid => {
			return players.find(p => p.pid === pid);
		});
	} else {
		playersSorted = players;
	}

	const profit = t.seasonAttrs !== undefined ? t.seasonAttrs.profit : 0;

	const statCols = getCols(...stats.map(stat => `stat:${stat}`));

	return (
		<>
			<p>
				More:{" "}
				{process.env.SPORT === "football" ? (
					<>
						<a href={helpers.leagueUrl(["depth", abbrev])}>Depth Chart</a> |{" "}
					</>
				) : null}
				<a href={helpers.leagueUrl(["team_finances", abbrev])}>Finances</a> |{" "}
				<a href={helpers.leagueUrl(["game_log", abbrev, season])}>Game Log</a> |{" "}
				<a href={helpers.leagueUrl(["team_history", abbrev])}>History</a> |{" "}
				<a href={helpers.leagueUrl(["transactions", abbrev])}>Transactions</a>
			</p>

			<TopStuff
				abbrev={abbrev}
				budget={budget}
				currentSeason={currentSeason}
				editable={editable}
				numConfs={numConfs}
				numPlayoffRounds={numPlayoffRounds}
				openRosterSpots={maxRosterSize - players.length}
				players={players}
				season={season}
				payroll={payroll}
				profit={profit}
				salaryCap={salaryCap}
				showTradeFor={showTradeFor}
				t={t}
			/>

			<div className="clearfix" />

			<SortableTable
				disabled={!editable}
				values={playersSorted}
				highlightHandle={({ index }) => index <= 4}
				rowClassName={({ index, isDragged, value: p }) =>
					classNames({
						separator:
							process.env.SPORT === "basketball" && index === 4 && !isDragged,
						"table-danger": p.hof,
					})
				}
				onChange={async ({ oldIndex, newIndex }) => {
					const pids = players.map(p => p.pid);
					const newSortedPids = arrayMove(pids, oldIndex, newIndex);
					setSortedPids(newSortedPids);
					await toWorker("main", "reorderRosterDrag", newSortedPids);
				}}
				cols={() => (
					<>
						<th>Name</th>
						<th title="Position">Pos</th>
						<th>Age</th>
						<th title="Overall Rating">Ovr</th>
						<th title="Potential Rating">Pot</th>
						{season === currentSeason ? <th>Contract</th> : null}
						<th title="Years With Team">YWT</th>
						{statCols.map(({ desc, title }) => (
							<th key={title} title={desc}>
								{title}
							</th>
						))}
						{editable ? (
							<th title="Playing Time Modifier">
								PT{" "}
								<HelpPopover placement="left" title="Playing Time Modifier">
									<p>
										Your coach will divide up playing time based on ability and
										stamina. If you want to influence his judgement, your
										options are:
									</p>
									<p>
										<span style={ptStyles["0"]}>0 No Playing Time</span>
										<br />
										<span style={ptStyles["0.75"]}>- Less Playing Time</span>
										<br />
										<span style={ptStyles["1"]}>
											&nbsp;&nbsp;&nbsp; Let Coach Decide
										</span>
										<br />
										<span style={ptStyles["1.25"]}>+ More Playing Time</span>
										<br />
										<span style={ptStyles["1.75"]}>
											++ Even More Playing Time
										</span>
									</p>
								</HelpPopover>
							</th>
						) : null}
						{showRelease ? (
							<th>
								Release{" "}
								<HelpPopover placement="left" title="Release Player">
									<p>
										To free up a roster spot, you can release a player from your
										team. You will still have to pay his salary (and have it
										count against the salary cap) until his contract expires
										(you can view your released players' contracts in your{" "}
										<a href={helpers.leagueUrl(["team_finances"])}>
											Team Finances
										</a>
										).
									</p>
									<p>
										However, if you just drafted a player and the regular season
										has not started yet, his contract is not guaranteed and you
										can release him for free.
									</p>
								</HelpPopover>
							</th>
						) : null}
						{showTradeFor ? <th>Trade For</th> : null}
						<th title="How Player Was Acquired">Acquired</th>
					</>
				)}
				row={({ value: p }) => (
					<>
						<td>
							<PlayerNameLabels
								pid={p.pid}
								injury={p.injury}
								skills={p.ratings.skills}
								watch={p.watch}
							>
								{p.name}
							</PlayerNameLabels>
						</td>
						<td>{p.ratings.pos}</td>
						<td>{p.age}</td>
						<td>
							<RatingWithChange change={p.ratings.dovr}>
								{p.ratings.ovr}
							</RatingWithChange>
						</td>
						<td>
							<RatingWithChange change={p.ratings.dpot}>
								{p.ratings.pot}
							</RatingWithChange>
						</td>
						{season === currentSeason ? (
							<td
								style={{
									fontStyle: justDrafted(p, phase, currentSeason)
										? "italic"
										: "normal",
								}}
								title={
									justDrafted(p, phase, currentSeason)
										? "Contracts for drafted players are not guaranteed until the regular season. If you release a drafted player before then, you pay nothing."
										: undefined
								}
							>
								{helpers.formatCurrency(p.contract.amount, "M")} thru{" "}
								{p.contract.exp}
							</td>
						) : null}
						<td>{p.stats.yearsWithTeam}</td>
						{stats.map(stat => (
							<td key={stat}>{helpers.roundStat(p.stats[stat], stat)}</td>
						))}
						{editable ? (
							<td>
								<PlayingTime p={p} userTid={userTid} />
							</td>
						) : null}
						{showRelease ? (
							<td>
								<button
									className="btn btn-light-bordered btn-xs"
									disabled={!p.canRelease}
									onClick={() => handleRelease(p, phase, currentSeason)}
								>
									Release
								</button>
							</td>
						) : null}
						{showTradeFor ? (
							<td title={p.untradableMsg}>
								<button
									className="btn btn-light-bordered btn-xs"
									disabled={p.untradable}
									onClick={() =>
										toWorker("actions", "tradeFor", { pid: p.pid })
									}
								>
									Trade For
								</button>
							</td>
						) : null}
						<td>
							<SafeHtml dirty={p.latestTransaction} />
						</td>
					</>
				)}
			/>
		</>
	);
};

Roster.propTypes = {
	abbrev: PropTypes.string.isRequired,
	budget: PropTypes.bool.isRequired,
	currentSeason: PropTypes.number.isRequired,
	editable: PropTypes.bool.isRequired,
	maxRosterSize: PropTypes.number.isRequired,
	numConfs: PropTypes.number.isRequired,
	numPlayoffRounds: PropTypes.number.isRequired,
	payroll: PropTypes.number,
	phase: PropTypes.number.isRequired,
	players: PropTypes.arrayOf(PropTypes.object).isRequired,
	salaryCap: PropTypes.number.isRequired,
	season: PropTypes.number.isRequired,
	showRelease: PropTypes.bool.isRequired,
	showTradeFor: PropTypes.bool.isRequired,
	stats: PropTypes.arrayOf(PropTypes.string).isRequired,
	t: PropTypes.object.isRequired,
	userTid: PropTypes.number.isRequired,
};

export default Roster;
