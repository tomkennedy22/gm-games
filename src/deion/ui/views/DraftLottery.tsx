import classNames from "classnames";
import range from "lodash/range";
import PropTypes from "prop-types";
import React, { useEffect, useReducer, useRef } from "react";
import { DraftAbbrev, ResponsiveTableWrapper } from "../components";
import useTitleBar from "../hooks/useTitleBar";
import { helpers, toWorker } from "../util";
import type { DraftLotteryResultArray, View } from "../../common/types";

const getProbs = (
	result: DraftLotteryResultArray,
	draftType: "nba1994" | "nba2019",
): (number | undefined)[][] => {
	const probs: number[][] = [];
	const topNCombos = new Map();
	const totalChances = result.reduce(
		(total, { chances }) => total + chances,
		0,
	);

	// Top N picks
	for (let i = 0; i < result.length; i++) {
		probs[i] = [];
		probs[i][0] = result[i].chances / totalChances; // First pick

		probs[i][1] = 0; // Second pick

		probs[i][2] = 0; // Third pick

		if (draftType === "nba2019") {
			probs[i][3] = 0; // Fourth pick
		}

		for (let k = 0; k < result.length; k++) {
			if (k !== i) {
				probs[i][1] +=
					((result[k].chances / totalChances) * result[i].chances) /
					(totalChances - result[k].chances);

				for (let l = 0; l < result.length; l++) {
					if (l !== i && l !== k) {
						const combosTemp =
							((result[k].chances / totalChances) *
								(result[l].chances / (totalChances - result[k].chances)) *
								result[i].chances) /
							(totalChances - result[k].chances - result[l].chances);
						probs[i][2] += combosTemp;

						if (draftType === "nba2019") {
							// Go one level deeper
							for (let m = 0; m < result.length; m++) {
								if (m !== i && m !== k && m !== l) {
									const combosTemp2 =
										((result[k].chances / totalChances) *
											(result[l].chances / (totalChances - result[k].chances)) *
											(result[m].chances /
												(totalChances -
													result[k].chances -
													result[l].chances)) *
											result[i].chances) /
										(totalChances -
											result[k].chances -
											result[l].chances -
											result[m].chances);
									probs[i][3] += combosTemp2;
									const topFourKey = JSON.stringify([i, k, l, m].sort());

									if (!topNCombos.has(topFourKey)) {
										topNCombos.set(topFourKey, combosTemp2);
									} else {
										topNCombos.set(
											topFourKey,
											topNCombos.get(topFourKey) + combosTemp2,
										);
									}
								}
							}
						} else {
							const topThreeKey = JSON.stringify([i, k, l].sort());

							if (!topNCombos.has(topThreeKey)) {
								topNCombos.set(topThreeKey, combosTemp);
							} else {
								topNCombos.set(
									topThreeKey,
									topNCombos.get(topThreeKey) + combosTemp,
								);
							}
						}
					}
				}
			}
		}
	}

	// Fill in picks (N+1)+
	for (let i = 0; i < result.length; i++) {
		const skipped = [0, 0, 0, 0, 0]; // Probabilities of being "skipped" (lower prob team in top N) 0/1/2/3/4 times

		for (const [key, prob] of topNCombos.entries()) {
			const inds = JSON.parse(key);
			let skipCount = 0;

			for (const ind of inds) {
				if (ind > i) {
					skipCount += 1;
				}
			}

			if (!inds.includes(i)) {
				skipped[skipCount] += prob;
			}
		}

		// Fill in table after first N picks
		for (let j = 0; j < (draftType === "nba2019" ? 5 : 4); j++) {
			if (i + j > (draftType === "nba2019" ? 3 : 2) && i + j < result.length) {
				probs[i][i + j] = skipped[j];
			}
		}
	}

	return probs;
};

type Props = View<"draftLottery">;
type State = {
	draftType: "nba1994" | "nba2019" | "noLottery" | "random" | undefined;
	result: DraftLotteryResultArray | undefined;
	season: number;
	toReveal: number[];
	// Values are indexes of props.result, starting with the 14th pick and ending with the 1st pick
	indRevealed: number;
	revealState: "init" | "running" | "paused" | "done";
};

type Action =
	| {
			type: "init";
			props: Props;
	  }
	| {
			type: "startClicked";
	  }
	| {
			type: "start";
			draftType: "nba1994" | "nba2019" | "noLottery" | "random";
			result: DraftLotteryResultArray;
			toReveal: number[];
			indRevealed: number;
	  }
	| {
			type: "pause";
	  }
	| {
			type: "resume";
	  }
	| {
			type: "revealOne";
	  };

const reducer = (state: State, action: Action): State => {
	switch (action.type) {
		case "init":
			return {
				draftType: action.props.draftType,
				result: action.props.result,
				toReveal: [],
				indRevealed: -1,
				revealState: "init",
				season: action.props.season,
			};
		case "startClicked":
			return {
				...state,
				revealState: "running",
			};
		case "start":
			return {
				...state,
				draftType: action.draftType,
				result: action.result,
				toReveal: action.toReveal,
				indRevealed: action.indRevealed,
				revealState: "running",
			};
		case "pause":
			return {
				...state,
				revealState: "paused",
			};
		case "resume":
			return {
				...state,
				revealState: "running",
			};
		case "revealOne": {
			const indRevealed = state.indRevealed + 1;
			const revealState =
				indRevealed >= state.toReveal.length - 1 ? "done" : state.revealState;
			return {
				...state,
				indRevealed,
				revealState,
			};
		}
	}
};

const DraftLotteryTable = (props: Props) => {
	const isMounted = useRef(true);
	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	// This is redundant with state because of https://github.com/facebook/react/issues/14010
	const numLeftToReveal = useRef(0); // Like indRevealed
	const revealState = useRef<State["revealState"]>("init");

	const timeoutID = useRef<number | undefined>();

	const [state, dispatch] = useReducer(reducer, {
		draftType: props.draftType,
		result: props.result,
		toReveal: [],
		indRevealed: -1,
		revealState: "init",
		season: props.season,
	});

	if (props.season !== state.season) {
		numLeftToReveal.current = 0;
		revealState.current = "init";
		dispatch({ type: "init", props: props });
	}

	const revealPickAuto = () => {
		if (
			!isMounted.current ||
			numLeftToReveal.current <= 0 ||
			revealState.current !== "running"
		) {
			return;
		}

		numLeftToReveal.current -= 1;
		dispatch({ type: "revealOne" });

		if (numLeftToReveal.current >= 1) {
			timeoutID.current = window.setTimeout(revealPickAuto, 1000);
		}
	};

	const startLottery = async () => {
		dispatch({ type: "startClicked" });
		const { draftType, result } = await toWorker("main", "draftLottery");
		const toReveal: number[] = [];

		for (let i = 0; i < result.length; i++) {
			const pick = result[i].pick;
			toReveal[pick - 1] = i;
			result[i].pick = undefined;
		}
		toReveal.reverse();

		revealState.current = "running";
		numLeftToReveal.current = toReveal.length;
		dispatch({ type: "start", draftType, result, toReveal, indRevealed: -1 });

		revealPickAuto();
	};

	const handleResume = () => {
		revealState.current = "running";
		dispatch({ type: "resume" });

		revealPickAuto();
	};

	const handlePause = () => {
		clearTimeout(timeoutID.current);
		timeoutID.current = undefined;
		revealState.current = "paused";
		dispatch({ type: "pause" });
	};

	const handleShowOne = () => {
		numLeftToReveal.current -= 1;
		dispatch({ type: "revealOne" });
	};

	const { season, ties, type, userTid } = props;
	const { draftType, result } = state;
	const probs =
		result !== undefined && (draftType === "nba2019" || draftType === "nba1994")
			? getProbs(result, draftType)
			: undefined;
	const NUM_PICKS = result !== undefined ? result.length : 14; // I don't think result can ever be undefined, but Flow does

	let table;

	if (result && probs) {
		// Checking both is redundant, but flow wants it
		table = (
			<ResponsiveTableWrapper>
				<table className="table table-striped table-bordered table-sm table-hover">
					<thead>
						<tr>
							<th colSpan={3} />
							<th colSpan={NUM_PICKS} className="text-center">
								Pick Probabilities
							</th>
						</tr>
						<tr>
							<th>Team</th>
							<th>Record</th>
							<th>Chances</th>
							{result.map((row, i) => (
								<th key={i}>{helpers.ordinal(i + 1)}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{result.map(
							({ tid, originalTid, chances, pick, won, lost, tied }, i) => {
								const pickCols = range(NUM_PICKS).map(j => {
									const prob = probs[i][j];
									const pct =
										prob !== undefined
											? `${(prob * 100).toFixed(1)}%`
											: undefined;
									let highlighted = false;

									if (pick !== undefined) {
										highlighted = pick === j + 1;
									} else if (NUM_PICKS - 1 - j <= state.indRevealed) {
										// Has this round been revealed?
										// Is this pick revealed?
										const ind = state.toReveal.findIndex(ind2 => ind2 === i);

										if (ind === NUM_PICKS - 1 - j) {
											highlighted = true;
										}
									}

									return (
										<td
											className={classNames({
												"table-success": highlighted,
											})}
											key={j}
										>
											{pct}
										</td>
									);
								});
								const row = (
									<tr key={originalTid}>
										<td
											className={classNames({
												"table-info": tid === userTid,
											})}
										>
											<DraftAbbrev
												tid={tid}
												originalTid={originalTid}
												season={season}
											/>
										</td>
										<td>
											<a href={helpers.leagueUrl(["standings", season])}>
												{won}-{lost}
												{ties ? <>-{tied}</> : null}
											</a>
										</td>
										<td>{chances}</td>
										{pickCols}
									</tr>
								);
								return row;
							},
						)}
					</tbody>
				</table>
			</ResponsiveTableWrapper>
		);
	} else {
		table = <p>No draft lottery results for {season}.</p>;
	}

	return (
		<>
			{type === "readyToRun" && state.revealState === "init" ? (
				<button
					className="btn btn-large btn-success mb-3"
					onClick={() => startLottery()}
				>
					Start Draft Lottery
				</button>
			) : null}
			{type === "readyToRun" &&
			(state.revealState === "running" || state.revealState === "paused") ? (
				<div className="btn-group mb-3">
					{state.revealState === "paused" ? (
						<button
							className="btn btn-light-bordered"
							onClick={handleResume}
							title="Resume Lottery"
						>
							<span className="glyphicon glyphicon-play" />
						</button>
					) : (
						<button
							className="btn btn-light-bordered"
							onClick={handlePause}
							title="Pause Lottery"
						>
							<span className="glyphicon glyphicon-pause" />
						</button>
					)}
					<button
						className="btn btn-light-bordered"
						disabled={state.revealState === "running"}
						onClick={handleShowOne}
						title="Show Next Pick"
					>
						<span className="glyphicon glyphicon-step-forward" />
					</button>
				</div>
			) : null}

			{table}
		</>
	);
};

DraftLotteryTable.propTypes = {
	draftType: PropTypes.oneOf(["nba1994", "nba2019", "noLottery", "random"]),
	result: PropTypes.arrayOf(
		PropTypes.shape({
			tid: PropTypes.number.isRequired,
			originalTid: PropTypes.number.isRequired,
			chances: PropTypes.number.isRequired,
			pick: PropTypes.number,
			won: PropTypes.number.isRequired,
			lost: PropTypes.number.isRequired,
		}),
	),
	season: PropTypes.number.isRequired,
	ties: PropTypes.bool.isRequired,
	type: PropTypes.string.isRequired,
	userTid: PropTypes.number.isRequired,
};

const DraftLottery = (props: Props) => {
	useTitleBar({
		title: "Draft Lottery",
		jumpTo: true,
		jumpToSeason: props.season,
		dropdownView: "draft_lottery",
		dropdownFields: {
			seasons: props.season,
		},
	});

	return (
		<>
			<p>
				More:{" "}
				<a href={helpers.leagueUrl(["draft_scouting"])}>
					Future Draft Scouting
				</a>{" "}
				|{" "}
				<a href={helpers.leagueUrl(["draft_history", props.season])}>
					Draft History
				</a>{" "}
				| <a href={helpers.leagueUrl(["draft_team_history"])}>Team History</a>
			</p>

			{props.type === "projected" ? (
				<p>
					This is what the draft lottery probabilities would be if the lottery
					was held right now.
				</p>
			) : null}

			<DraftLotteryTable {...props} />
		</>
	);
};

DraftLottery.propTypes = DraftLotteryTable.propTypes;

export default DraftLottery;
