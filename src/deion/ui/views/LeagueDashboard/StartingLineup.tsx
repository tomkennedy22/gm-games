import PropTypes from "prop-types";
import React from "react";
import {
	PlayerNameLabels,
	RatingWithChange,
	ResponsiveTableWrapper,
} from "../../components";
import { getCols, helpers } from "../../util";
import type { View } from "../../../common/types";

const StartingLineup = ({
	starters,
	startersStats,
}: Pick<View<"leagueDashboard">, "starters" | "startersStats">) => {
	const statCols = getCols(...startersStats.map(stat => `stat:${stat}`));

	return (
		<>
			<h2>
				{process.env.SPORT === "basketball" ? "Starting Lineup" : "Top Players"}
			</h2>
			<ResponsiveTableWrapper nonfluid>
				<table className="table table-striped table-bordered table-sm">
					<thead>
						<tr>
							<th>Name</th>
							<th title="Position">Pos</th>
							<th>Age</th>
							<th title="Years With Team">YWT</th>
							<th title="Overall Rating">Ovr</th>
							<th title="Potential Rating">Pot</th>
							<th>Contract</th>
							{statCols.map(({ desc, title }) => (
								<th key={title} title={desc}>
									{title}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{starters.map(p => (
							<tr key={p.pid}>
								<td>
									<PlayerNameLabels
										injury={p.injury}
										pid={p.pid}
										skills={p.ratings.skills}
										watch={p.watch}
									>
										{p.name}
									</PlayerNameLabels>
								</td>
								<td>{p.ratings.pos}</td>
								<td>{p.age}</td>
								<td>{p.stats.yearsWithTeam}</td>
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
								<td>
									{helpers.formatCurrency(p.contract.amount, "M")} thru{" "}
									{p.contract.exp}
								</td>
								{startersStats.map(stat => (
									<td key={stat}>{helpers.roundStat(p.stats[stat], stat)}</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</ResponsiveTableWrapper>
			<div />
			<a href={helpers.leagueUrl(["roster"])}>» Full Roster</a>
		</>
	);
};

StartingLineup.propTypes = {
	starters: PropTypes.arrayOf(PropTypes.object).isRequired,
	startersStats: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default StartingLineup;
