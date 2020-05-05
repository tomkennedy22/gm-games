/* eslint-disable @typescript-eslint/camelcase */
import { ads, confirm, local, localActions, realtimeUpdate } from "../util";
import { showEvent } from "../util/logEvent";
import type {
	GameAttributes,
	LocalStateUI,
	LogEventShowOptions,
	UpdateEvents,
} from "../../common/types";

/**
 * Ping a counter at basketball-gm.com.
 *
 * This should only do something if it isn't being run from a unit test and it's actually on basketball-gm.com.
 */
const bbgmPing = (
	type: "customizePlayers" | "league" | "season" | "version",
	arg?: any,
) => {
	if (window.enableLogging && window.gtag) {
		if (type === "league") {
			window.gtag("event", "New league", {
				event_category: arg[1],
				event_label: String(arg[0]),
			});
		} else if (type === "season") {
			window.gtag("event", "Completed season", {
				event_category: "BBGM",
				event_label: String(arg),
			});
		} else if (type === "version") {
			window.gtag("event", "Version", {
				event_category: "BBGM",
				event_label: window.bbgmVersion,
			});
		}
	}
};

// Read from goldUntil rather than local because this is called before local is updated
const initAds = (goldUntil: number | undefined) => {
	let hideAds = false; // No ads for Gold members

	const currentTimestamp = Math.floor(Date.now() / 1000);

	if (goldUntil === undefined || currentTimestamp < goldUntil) {
		hideAds = true;
	}

	if (hideAds) {
		// Get rid of margin saved for skyscraper on right
		const container = document.getElementsByClassName("bbgm-container")[0];

		if (container instanceof HTMLElement) {
			container.style.paddingRight = "15px";
			container.style.maxWidth = "100%";
		}
	} else {
		window.bbgmAds.cmd.push(() => {
			// Show hidden divs. skyscraper has its own code elsewhere to manage display.
			const showDivs =
				window.screen && window.screen.width < 768
					? ["bbgm-ads-mobile"]
					: [
							"bbgm-ads-top",
							"bbgm-ads-bottom1",
							"bbgm-ads-bottom2",
							"skyscraper-wrapper",
					  ];

			for (const id of showDivs) {
				const div = document.getElementById(id);

				if (div) {
					div.style.removeProperty("display");
				}
			}

			const adDivs =
				window.screen && window.screen.width < 768
					? ["bbgm-ads-mobile"]
					: [
							"bbgm-ads-top",
							"bbgm-ads-bottom1",
							"bbgm-ads-bottom2",
							"bbgm-ads-skyscraper",
					  ];
			window.bbgmAds.init(adDivs).then(() => {
				if (window.screen && window.screen.width >= 768) {
					// Show the logo too
					const logo = document.getElementById("bbgm-ads-logo");

					if (logo) {
						logo.style.display = "flex";
					}
				}
			});
		});
	}
};

const mergeGames = (games: LocalStateUI["games"]) => {
	localActions.mergeGames(games);
};

// Should only be called from Shared Worker, to move other tabs to new league because only one can be open at a time
const newLid = async (lid: number) => {
	const parts = window.location.pathname.split("/");

	if (parts[1] === "l" && parseInt(parts[2], 10) !== lid) {
		parts[2] = String(lid);
		const newPathname = parts.join("/");
		await realtimeUpdate(["firstRun"], newPathname);
		localActions.update({
			lid,
		});
	}
};

async function realtimeUpdate2(
	updateEvents: UpdateEvents = [],
	url?: string,
	raw?: object,
) {
	await realtimeUpdate(updateEvents, url, raw);
}

const resetLeague = () => {
	localActions.resetLeague();
};

const setGameAttributes = (gameAttributes: Partial<GameAttributes>) => {
	localActions.updateGameAttributes(gameAttributes);
};

const setLocal = (obj: Partial<LocalStateUI>) => {
	localActions.update(obj);
};

const showEvent2 = (options: LogEventShowOptions) => {
	showEvent(options);
};

const showModal = () => {
	if (!window.enableLogging) {
		return;
	}

	// No ads for Gold members
	if (local.getState().gold !== false) {
		return;
	}

	const r = Math.random();

	if (r < 0.96) {
		ads.showGcs();
	} else {
		ads.showModal();
	}
};

const updateLocal = (obj: Partial<LocalStateUI>) => {
	localActions.update(obj);
};

const updateTeamOvrs = (ovrs: number[]) => {
	const games = local.getState().games;

	// Find upcoming game, it's the only one that needs updating
	const game = games.find(game => game.teams[0].pts === undefined);
	if (game) {
		const { teams } = game;
		if (
			teams[0].ovr !== ovrs[teams[0].tid] ||
			teams[1].ovr !== ovrs[teams[1].tid]
		) {
			teams[0].ovr = ovrs[teams[0].tid];
			teams[1].ovr = ovrs[teams[1].tid];

			localActions.update({
				games: games.slice(),
			});
		}
	}
};

export default {
	bbgmPing,
	confirm,
	initAds,
	mergeGames,
	newLid,
	realtimeUpdate: realtimeUpdate2,
	resetLeague,
	setGameAttributes,
	setLocal,
	showEvent: showEvent2,
	showModal,
	updateLocal,
	updateTeamOvrs,
};
