import PropTypes from "prop-types";
import React from "react";
import useTitleBar from "../hooks/useTitleBar";
import { helpers, getCols } from "../util";
import {
	PlayerNameLabels,
	DataTable,
	RatingWithChange,
	StatWithChange,
} from "../components";
import type { View } from "../../common/types";

const AwardRaces = ({
	awardCandidates,
	season,
	userTid,
}: View<"awardRaces">) => {
	useTitleBar({
		title: "Award Races",
		jumpTo: true,
		jumpToSeason: season,
		dropdownView: "award_races",
		dropdownFields: {
			seasons: season,
		},
	});

	const globalCols = getCols("#", "Name", "Pos", "Age", "Team", "Ovr");

	return (
		<>
			<div className="row" style={{ marginTop: -14 }}>
				{awardCandidates.map(({ name, players, stats }) => {
					const mip = name === "Most Improved Player";

					const cols = [
						...globalCols,
						...getCols(...stats.map(stat => `stat:${stat}`)),
					];

					const rows = players.map((p, j) => {
						let ps: any;
						for (let i = p.stats.length - 1; i >= 0; i--) {
							if (p.stats[i].season === season && !p.stats[i].playoffs) {
								ps = p.stats[i];
								break;
							}
						}
						let pr;
						for (let i = p.ratings.length - 1; i >= 0; i--) {
							if (p.ratings[i].season === season) {
								pr = p.ratings[i];
								break;
							}
						}

						const pos = pr ? pr.pos : "?";
						const abbrev = ps ? ps.abbrev : undefined;
						const tid = ps ? ps.tid : undefined;

						const data = [
							j + 1,
							<PlayerNameLabels
								injury={p.injury}
								pid={p.pid}
								skills={pr ? pr.skills : []}
								watch={p.watch}
							>
								{p.name}
							</PlayerNameLabels>,
							pos,
							p.age,
							<a href={helpers.leagueUrl(["roster", abbrev, season])}>
								{abbrev}
							</a>,
						];

						if (mip) {
							data.push(
								pr ? (
									<RatingWithChange change={pr.dovr}>{pr.ovr}</RatingWithChange>
								) : undefined,
							);

							let ps2: any;
							for (let i = p.stats.length - 1; i >= 0; i--) {
								if (p.stats[i].season === season - 1 && !p.stats[i].playoffs) {
									ps2 = p.stats[i];
									break;
								}
							}
							data.push(
								...stats.map(stat => {
									if (!ps && !ps2) {
										return undefined;
									}

									if (!ps2) {
										return helpers.roundStat(ps[stat], stat);
									}

									return (
										<StatWithChange change={ps[stat] - ps2[stat]} stat={stat}>
											{ps[stat]}
										</StatWithChange>
									);
								}),
							);
						} else {
							data.push(pr ? pr.ovr : undefined);
							const statsRow = stats.map(stat =>
								ps ? helpers.roundStat(ps[stat], stat) : undefined,
							);
							data.push(...statsRow);
						}

						return {
							key: p.pid,
							data,
							classNames: {
								"table-danger": p.hof,
								"table-info": tid === userTid,
							},
						};
					});

					return (
						<div
							key={name}
							className={mip ? "col-12 col-lg-9" : "col-12 col-lg-6"}
							style={{ marginTop: 14 }}
						>
							<h2>{name}</h2>
							{rows.length > 0 ? (
								<DataTable
									cols={cols}
									defaultSort={[0, "asc"]}
									hideAllControls
									name={`AwardRaces${name}`}
									rows={rows}
								/>
							) : (
								<p>No candidates yet...</p>
							)}
						</div>
					);
				})}
			</div>
		</>
	);
};

AwardRaces.propTypes = {
	awardCandidates: PropTypes.arrayOf(PropTypes.object).isRequired,
	season: PropTypes.number.isRequired,
	userTid: PropTypes.number.isRequired,
};

export default AwardRaces;
