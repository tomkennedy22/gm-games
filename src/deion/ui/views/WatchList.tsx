import PropTypes from "prop-types";
import React, { useCallback, useState } from "react";
import { Dropdown } from "react-bootstrap";
import { PLAYER } from "../../common";
import useTitleBar from "../hooks/useTitleBar";
import { getCols, helpers, toWorker } from "../util";
import { DataTable, PlayerNameLabels, WatchBlock } from "../components";
import type { View } from "../../common/types";

const WatchList = ({
	players,
	playoffs,
	statType,
	stats,
}: View<"watchList">) => {
	const [clearing, setClearing] = useState(false);

	const clearWatchList = useCallback(async () => {
		setClearing(true);
		await toWorker("main", "clearWatchList");
		setClearing(false);
	}, []);

	useTitleBar({
		title: "Watch List",
		dropdownView: "watch_list",
		dropdownFields: { statTypes: statType, playoffs },
	});

	const cols = getCols(
		"",
		"Name",
		"Pos",
		"Age",
		"Team",
		"Ovr",
		"Pot",
		"Contract",
		...stats.map(stat => `stat:${stat}`),
	);

	const rows = players.map(p => {
		let contract;
		if (p.tid === PLAYER.RETIRED) {
			contract = "Retired";
		} else if (p.tid === PLAYER.UNDRAFTED) {
			contract = `${p.draft.year} Draft Prospect`;
		} else {
			contract = `${helpers.formatCurrency(p.contract.amount, "M")} thru ${
				p.contract.exp
			}`;
		}

		return {
			key: p.pid,
			data: [
				<WatchBlock pid={p.pid} watch={p.watch} />,
				<PlayerNameLabels
					injury={p.injury}
					pid={p.pid}
					skills={p.ratings.skills}
					watch={p.watch}
				>
					{p.name}
				</PlayerNameLabels>,
				p.ratings.pos,
				p.age,
				<a href={helpers.leagueUrl(["roster", p.abbrev])}>{p.abbrev}</a>,
				p.ratings.ovr,
				p.ratings.pot,
				contract,
				...stats.map(stat =>
					helpers.roundStat(p.stats[stat], stat, statType === "totals"),
				),
			],
		};
	});

	return (
		<>
			<Dropdown className="float-right my-1">
				<Dropdown.Toggle
					id="watch-list-other-reports"
					className="btn-light-bordered"
				>
					Other Reports
				</Dropdown.Toggle>
				<Dropdown.Menu>
					<Dropdown.Item href={helpers.leagueUrl(["player_stats", "watch"])}>
						Player Stats
					</Dropdown.Item>
					<Dropdown.Item href={helpers.leagueUrl(["player_ratings", "watch"])}>
						Player Ratings
					</Dropdown.Item>
				</Dropdown.Menu>
			</Dropdown>

			<p>
				Click the watch icon <span className="glyphicon glyphicon-flag" /> to
				add or remove a player from this list.
			</p>
			<p>
				On other pages, you can find the watch icon by clicking the info button{" "}
				<span className="glyphicon glyphicon-stats" /> next to a player's name.
			</p>

			<button
				className="btn btn-danger mb-3"
				disabled={clearing}
				onClick={clearWatchList}
			>
				Clear Watch List
			</button>

			<DataTable
				cols={cols}
				defaultSort={[5, "desc"]}
				name="WatchList"
				pagination
				rows={rows}
			/>
		</>
	);
};

WatchList.propTypes = {
	players: PropTypes.arrayOf(PropTypes.object).isRequired,
	playoffs: PropTypes.oneOf(["playoffs", "regularSeason"]).isRequired,
	statType: PropTypes.oneOf(["per36", "perGame", "totals"]).isRequired,
	stats: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default WatchList;
