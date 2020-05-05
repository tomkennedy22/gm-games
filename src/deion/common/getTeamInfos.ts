const teamInfos: {
	[key: string]: {
		region: string;
		name: string;
		pop: number;
		colors: [string, string, string];
	};
} = {
	ATL: {
		region: "Atlanta",
		name: "Gold Club",
		pop: 5.3,
		colors: ["#5c4a99", "#f0e81c", "#211e1e"],
	},
	BAL: {
		region: "Baltimore",
		name: "Crabs",
		pop: 2.7,
		colors: ["#7a1319", "#89bfd3", "#07364f"],
	},
	BOS: {
		region: "Boston",
		name: "Massacre",
		pop: 7.3,
		colors: ["#0d435e", "#f0494a", "#cccccc"],
	},
	BKN: {
		region: "Brooklyn",
		name: "Bagels",
		pop: 21.5,
		colors: ["#000000", "#cccccc", "#ffffff"],
	},
	CHA: {
		region: "Charlotte",
		name: "Queens",
		pop: 1.5,
		colors: ["#000000", "#cccccc", "#ffffff"],
	},
	CHI: {
		region: "Chicago",
		name: "Whirlwinds",
		pop: 9.1,
		colors: ["#ef670a", "#caeaf9", "#d3d3d3"],
	},
	CIN: {
		region: "Cincinnati",
		name: "Riots",
		pop: 1.6,
		colors: ["#000000", "#c11616", "#2966ef"],
	},
	CLE: {
		region: "Cleveland",
		name: "Curses",
		pop: 1.7,
		colors: ["#211e1e", "#f8e3cc", "#3f1c59"],
	},
	DAL: {
		region: "Dallas",
		name: "Snipers",
		pop: 6.6,
		colors: ["#be2026", "#2b2e81", "#ffffff"],
	},
	DEN: {
		region: "Denver",
		name: "High",
		pop: 2.7,
		colors: ["#216935", "#163a1c", "#a1d297"],
	},
	DET: {
		region: "Detroit",
		name: "Muscle",
		pop: 4.0,
		colors: ["#3a5eab", "#708fc7", "#0a1130"],
	},
	HOU: {
		region: "Houston",
		name: "Apollos",
		pop: 6.2,
		colors: ["#4c91c2", "#c4c4c3", "#ffffff"],
	},
	IND: {
		region: "Indianapolis",
		name: "Crossroads",
		pop: 1.6,
		colors: ["#000000", "#cccccc", "#ffffff"],
	},
	KC: {
		region: "Kansas City",
		name: "Sauce",
		pop: 1.6,
		colors: ["#8f2100", "#ffb500", "#d4731c"],
	},
	LA: {
		region: "Los Angeles",
		name: "Earthquakes",
		pop: 15.6,
		colors: ["#6b6b6b", "#f15d24", "#dedddd"],
	},
	LAL: {
		region: "Los Angeles",
		name: "Lowriders",
		pop: 15.6,
		colors: ["#000000", "#cccccc", "#ffffff"],
	},
	LV: {
		region: "Las Vegas",
		name: "Blue Chips",
		pop: 2.1,
		colors: ["#1c73bb", "#ffd600", "#0c5983"],
	},
	MEM: {
		region: "Memphis",
		name: "Blues",
		pop: 1.3,
		colors: ["#000000", "#cccccc", "#ffffff"],
	},
	MIA: {
		region: "Miami",
		name: "Cyclones",
		pop: 6.1,
		colors: ["#d8519d", "#4ac1c0", "#f15949"],
	},
	MIL: {
		region: "Milwaukee",
		name: "Cheesemakers",
		pop: 1.5,
		colors: ["#000000", "#cccccc", "#ffffff"],
	},
	MIN: {
		region: "Minneapolis",
		name: "Blizzard",
		pop: 2.8,
		colors: ["#3d2971", "#8accdc", "#ed9a22"],
	},
	MON: {
		region: "Montreal",
		name: "Mounties",
		pop: 3.5,
		colors: ["#eac494", "#ed1d3d", "#f2b316"],
	},
	MXC: {
		region: "Mexico City",
		name: "Aztecs",
		pop: 20.5,
		colors: ["#1a9190", "#510f0f", "#eb5924"],
	},
	NOL: {
		region: "New Orleans",
		name: "Bayou",
		pop: 1.1,
		colors: ["#000000", "#cccccc", "#ffffff"],
	},
	NYC: {
		region: "New York",
		name: "Bankers",
		pop: 21.5,
		colors: ["#1e73ba", "#ff8500", "#ffffff"],
	},
	OKC: {
		region: "Oklahoma City",
		name: "66ers",
		pop: 1.4,
		colors: ["#000000", "#cccccc", "#ffffff"],
	},
	ORL: {
		region: "Orlando",
		name: "Juice",
		pop: 2.2,
		colors: ["#000000", "#cccccc", "#ffffff"],
	},
	PHI: {
		region: "Philadelphia",
		name: "Cheesesteaks",
		pop: 5.5,
		colors: ["#bee6f6", "#ffe67b", "#3a3a3a"],
	},
	PHO: {
		region: "Phoenix",
		name: "Vultures",
		pop: 4.3,
		colors: ["#d17d2a", "#231f20", "#c09867"],
	},
	PIT: {
		region: "Pittsburgh",
		name: "Rivers",
		pop: 1.7,
		colors: ["#fbee28", "#231f20", "#ffffff"],
	},
	POR: {
		region: "Portland",
		name: "Roses",
		pop: 2.0,
		colors: ["#e41d34", "#1e1e1e", "#e7a9cc"],
	},
	SA: {
		region: "San Antonio",
		name: "Churros",
		pop: 2.0,
		colors: ["#4a2b14", "#30d9ff", "#704723"],
	},
	SAC: {
		region: "Sacramento",
		name: "Gold Rush",
		pop: 1.8,
		colors: ["#e4c649", "#735823", "#f8e19f"],
	},
	SD: {
		region: "San Diego",
		name: "Pandas",
		pop: 4.7,
		colors: ["#231f20", "#ffffff", "#b2b3b3"],
	},
	SEA: {
		region: "Seattle",
		name: "Symphony",
		pop: 3.8,
		colors: ["#47ff47", "#000000", "#8f8f8f"],
	},
	SF: {
		region: "San Francisco",
		name: "Venture Capitalists",
		pop: 6.5,
		colors: ["#0e442e", "#d75f27", "#e7d3ae"],
	},
	STL: {
		region: "St. Louis",
		name: "Spirits",
		pop: 2.2,
		colors: ["#c0c1c2", "#133cd1", "#3a3a3a"],
	},
	TOR: {
		region: "Toronto",
		name: "Beavers",
		pop: 6.6,
		colors: ["#832525", "#5e372c", "#331b16"],
	},
	TPA: {
		region: "Tampa",
		name: "Turtles",
		pop: 2.7,
		colors: ["#eb851e", "#17cc21", "#023a02"],
	},
	UTA: {
		region: "Utah",
		name: "Missionaries",
		pop: 2.3,
		colors: ["#000000", "#cccccc", "#ffffff"],
	},
	VAN: {
		region: "Vancouver",
		name: "Whalers",
		pop: 2.3,
		colors: ["#1ea194", "#213063", "#117568"],
	},
	WAS: {
		region: "Washington",
		name: "Monuments",
		pop: 6.2,
		colors: ["#213063", "#c5ae6e", "#ffffff"],
	},
};

teamInfos.LAE = teamInfos.LA;
teamInfos.GS = {
	...teamInfos.SF,
	region: "Golden State",
};

const getTeamInfos = (
	teams: { tid: number; cid: number; did: number; abbrev: string }[],
) => {
	return teams.map(t => {
		if (!teamInfos[t.abbrev]) {
			throw new Error(`Unknown abbrev: ${t.abbrev}`);
		}

		return {
			...t,
			...teamInfos[t.abbrev],
			imgURL: `/img/logos/${t.abbrev}.png`,
		};
	});
};

export default getTeamInfos;
