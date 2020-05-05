import React from "react";
import Dropdown from "./Dropdown";
import DropdownLinks from "./DropdownLinks";
import NewWindowLink from "./NewWindowLink";
import { useLocalShallow } from "../util";
import type { MenuItemHeader } from "../../common/types";

const genPath = (parts: string[], season: string | undefined) => {
	if (season !== undefined) {
		return [...parts, season];
	}

	return parts;
};

const TitleBar = () => {
	const {
		title,
		hideNewWindow,
		jumpTo,
		jumpToSeason,
		dropdownExtraParam,
		dropdownView,
		dropdownFields,
		moreInfoAbbrev,
		moreInfoSeason,
		lid,
	} = useLocalShallow(state => ({
		title: state.title,
		hideNewWindow: state.hideNewWindow,
		jumpTo: state.jumpTo,
		jumpToSeason: state.jumpToSeason,
		dropdownExtraParam: state.dropdownExtraParam,
		dropdownView: state.dropdownView,
		dropdownFields: state.dropdownFields,
		moreInfoAbbrev: state.moreInfoAbbrev,
		moreInfoSeason: state.moreInfoSeason,
		lid: state.lid,
	}));

	if (title === undefined) {
		return null;
	}

	const menuItems: MenuItemHeader[] = [];

	if (jumpTo) {
		// Sometimes the season will be some nonsense like "all", in which case we can't generally use
		// it (although maybe it would be good to in some cases).
		const season =
			typeof jumpToSeason === "number" ? String(jumpToSeason) : undefined;
		menuItems.push({
			type: "header",
			long: "Jump To",
			short: "Jump To",
			league: true,
			children: [
				{
					type: "link",
					league: true,
					path: genPath(["standings"], season),
					text: "Standings",
				},
				{
					type: "link",
					league: true,
					path: genPath(["playoffs"], season),
					text: "Playoffs",
				},
				{
					type: "link",
					league: true,
					path: genPath(["history"], season),
					text: "Season Summary",
				},
				{
					type: "link",
					league: true,
					path: genPath(["league_finances"], season),
					text: "Finances",
				},
				{
					type: "link",
					league: true,
					path: genPath(["transactions", "all"], season),
					text: "Transactions",
				},
				{
					type: "link",
					league: true,
					path: genPath(["draft_history"], season),
					text: "Draft",
				},
				{
					type: "link",
					league: true,
					path: genPath(["leaders"], season),
					text: "Leaders",
				},
				{
					type: "link",
					league: true,
					path: genPath(["team_stats"], season),
					text: "Team Stats",
				},
				{
					type: "link",
					league: true,
					path: genPath(["player_bios", "all"], season),
					text: "Player Bios",
				},
				{
					type: "link",
					league: true,
					path: genPath(["player_stats", "all"], season),
					text: "Player Stats",
				},
				{
					type: "link",
					league: true,
					path: genPath(["player_ratings", "all"], season),
					text: "Player Ratings",
				},
			],
		});
	}

	if (moreInfoAbbrev && moreInfoSeason !== undefined) {
		menuItems.push({
			type: "header",
			long: "More Info",
			short: "More Info",
			league: true,
			children: [
				{
					type: "link",
					league: true,
					path: ["player_stats", moreInfoAbbrev, moreInfoSeason],
					text: "Player Stats",
				},
				{
					type: "link",
					league: true,
					path: ["player_ratings", moreInfoAbbrev, moreInfoSeason],
					text: "Player Ratings",
				},
			],
		});
	}

	return (
		<nav className="navbar navbar-border navbar-light title-bar">
			<h1 className="mb-0">
				{title}
				{!hideNewWindow ? <NewWindowLink /> : null}
			</h1>
			{dropdownView && dropdownFields ? (
				<Dropdown
					extraParam={dropdownExtraParam}
					view={dropdownView}
					fields={dropdownFields}
				/>
			) : null}
			<DropdownLinks className="ml-auto" lid={lid} menuItems={menuItems} />
		</nav>
	);
};

export default TitleBar;
