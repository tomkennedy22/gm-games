import PropTypes from "prop-types";
import React, { useState, ChangeEvent } from "react";
import { PHASE } from "../../../common";
import useTitleBar from "../../hooks/useTitleBar";
import { toWorker } from "../../util";
import AssetList from "./AssetList";
import Buttons from "./Buttons";
import Summary from "./Summary";
import type { View } from "../../../common/types";

const Trade = (props: View<"trade">) => {
	const [state, setState] = useState({
		accepted: false,
		asking: false,
		forceTrade: false,
		message: null,
	});

	const handleChangeAsset = async (
		userOrOther: "other" | "user",
		playerOrPick: "pick" | "player",
		includeOrExclude: "include" | "exclude",
		id: number,
	) => {
		setState(prevState => ({ ...prevState, message: null }));
		const ids = {
			"user-pids": props.userPids,
			"user-pids-excluded": props.userPidsExcluded,
			"user-dpids": props.userDpids,
			"user-dpids-excluded": props.userDpidsExcluded,
			"other-pids": props.otherPids,
			"other-pids-excluded": props.otherPidsExcluded,
			"other-dpids": props.otherDpids,
			"other-dpids-excluded": props.otherDpidsExcluded,
		};
		const idType = playerOrPick === "player" ? "pids" : "dpids";
		const excluded = includeOrExclude === "exclude" ? "-excluded" : "";
		const key = `${userOrOther}-${idType}${excluded}` as keyof typeof ids;

		if (ids[key].includes(id)) {
			ids[key] = ids[key].filter(currId => currId !== id);
		} else {
			ids[key].push(id);
		}

		const teams = [
			{
				tid: props.userTid,
				pids: ids["user-pids"],
				pidsExcluded: ids["user-pids-excluded"],
				dpids: ids["user-dpids"],
				dpidsExcluded: ids["user-dpids-excluded"],
			},
			{
				tid: props.otherTid,
				pids: ids["other-pids"],
				pidsExcluded: ids["other-pids-excluded"],
				dpids: ids["other-dpids"],
				dpidsExcluded: ids["other-dpids-excluded"],
			},
		];
		await toWorker("main", "updateTrade", teams);
	};

	const handleChangeTeam = async (event: ChangeEvent<HTMLSelectElement>) => {
		setState(prevState => ({ ...prevState, message: null }));
		const otherTid = parseInt(event.currentTarget.value, 10);
		const teams = [
			{
				tid: props.userTid,
				pids: props.userPids,
				pidsExcluded: props.userPidsExcluded,
				dpids: props.userDpids,
				dpidsExcluded: props.userDpidsExcluded,
			},
			{
				tid: otherTid,
				pids: [],
				pidsExcluded: [],
				dpids: [],
				dpidsExcluded: [],
			},
		];
		await toWorker("main", "createTrade", teams);
	};

	const handleClickAsk = async () => {
		setState(prevState => ({ ...prevState, asking: true, message: null }));
		const message = await toWorker("main", "tradeCounterOffer");
		setState(prevState => ({ ...prevState, asking: false, message }));
	};

	const handleClickClear = async () => {
		setState(prevState => ({ ...prevState, message: null }));
		await toWorker("main", "clearTrade");
	};

	const handleClickForceTrade = () => {
		setState(prevState => ({
			...prevState,
			forceTrade: !prevState.forceTrade,
		}));
	};

	const handleClickPropose = async () => {
		const [accepted, message] = await toWorker(
			"main",
			"proposeTrade",
			state.forceTrade,
		);
		setState(prevState => ({ ...prevState, accepted, message }));
	};

	const {
		gameOver,
		godMode,
		lost,
		otherPicks,
		otherRoster,
		otherTid,
		phase,
		salaryCap,
		summary,
		showResigningMsg,
		stats,
		strategy,
		teams,
		tied,
		ties,
		userPicks,
		userRoster,
		userTeamName,
		won,
	} = props;
	useTitleBar({
		title: "Trade",
	});
	const noTradingAllowed =
		(phase >= PHASE.AFTER_TRADE_DEADLINE && phase <= PHASE.PLAYOFFS) ||
		phase === PHASE.FANTASY_DRAFT ||
		gameOver;
	return (
		<>
			{showResigningMsg ? (
				<p>
					You can't trade players whose contracts expired this season, but their
					old contracts still count against team salary caps until they are
					either re-signed or become free agents.
				</p>
			) : null}

			<p>
				If a player has been signed within the past 14 days, he is not allowed
				to be traded.
			</p>

			<div className="row">
				<div className="col-md-9">
					<select
						className="float-left form-control select-team mb-2 mr-2"
						value={otherTid}
						onChange={handleChangeTeam}
					>
						{teams.map(t => (
							<option key={t.tid} value={t.tid}>
								{t.region} {t.name}
							</option>
						))}
					</select>
					<div
						style={{
							paddingTop: 7,
						}}
					>
						{won}-{lost}
						{ties ? <>-{tied}</> : null}, {strategy}
					</div>
					<div className="clearfix" />
					<AssetList
						handleToggle={handleChangeAsset}
						picks={otherPicks}
						roster={otherRoster}
						stats={stats}
						userOrOther="other"
					/>

					<h2 className="mt-3">{userTeamName}</h2>
					<AssetList
						handleToggle={handleChangeAsset}
						picks={userPicks}
						roster={userRoster}
						stats={stats}
						userOrOther="user"
					/>
				</div>
				<div className="col-md-3 trade-summary">
					<Summary
						accepted={state.accepted}
						message={state.message}
						salaryCap={salaryCap}
						summary={summary}
					/>
					{!noTradingAllowed ? (
						<div className="text-center">
							<Buttons
								asking={state.asking}
								enablePropose={summary.enablePropose}
								forceTrade={state.forceTrade}
								godMode={godMode}
								handleClickAsk={handleClickAsk}
								handleClickClear={handleClickClear}
								handleClickForceTrade={handleClickForceTrade}
								handleClickPropose={handleClickPropose}
							/>
						</div>
					) : (
						<p className="alert alert-danger">
							You're not allowed to make trades now.
						</p>
					)}
				</div>
			</div>
		</>
	);
};

Trade.propTypes = {
	gameOver: PropTypes.bool.isRequired,
	godMode: PropTypes.bool.isRequired,
	lost: PropTypes.number.isRequired,
	otherDpids: PropTypes.arrayOf(PropTypes.number).isRequired,
	otherDpidsExcluded: PropTypes.arrayOf(PropTypes.number).isRequired,
	otherPicks: PropTypes.array.isRequired,
	otherPids: PropTypes.arrayOf(PropTypes.number).isRequired,
	otherPidsExcluded: PropTypes.arrayOf(PropTypes.number).isRequired,
	otherRoster: PropTypes.array.isRequired,
	otherTid: PropTypes.number.isRequired,
	phase: PropTypes.number.isRequired,
	salaryCap: PropTypes.number.isRequired,
	summary: PropTypes.object.isRequired,
	showResigningMsg: PropTypes.bool.isRequired,
	stats: PropTypes.arrayOf(PropTypes.string).isRequired,
	strategy: PropTypes.string.isRequired,
	teams: PropTypes.arrayOf(
		PropTypes.shape({
			name: PropTypes.string.isRequired,
			region: PropTypes.string.isRequired,
			tid: PropTypes.number.isRequired,
		}),
	).isRequired,
	tied: PropTypes.number,
	ties: PropTypes.bool.isRequired,
	userDpids: PropTypes.arrayOf(PropTypes.number).isRequired,
	userDpidsExcluded: PropTypes.arrayOf(PropTypes.number).isRequired,
	userPicks: PropTypes.array.isRequired,
	userPids: PropTypes.arrayOf(PropTypes.number).isRequired,
	userPidsExcluded: PropTypes.arrayOf(PropTypes.number).isRequired,
	userRoster: PropTypes.array.isRequired,
	userTid: PropTypes.number.isRequired,
	userTeamName: PropTypes.string.isRequired,
	won: PropTypes.number.isRequired,
};

export default Trade;
