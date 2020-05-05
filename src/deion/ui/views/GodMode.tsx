import classNames from "classnames";
import groupBy from "lodash/groupBy";
import PropTypes from "prop-types";
import React, { useState, ReactNode, ChangeEvent, FormEvent } from "react";
import { HelpPopover } from "../components";
import useTitleBar from "../hooks/useTitleBar";
import { localActions, logEvent, toWorker } from "../util";
import type { View } from "../../common/types";

type Key =
	| "numGames"
	| "quarterLength"
	| "minRosterSize"
	| "maxRosterSize"
	| "numGamesPlayoffSeries"
	| "numPlayoffByes"
	| "draftType"
	| "numSeasonsFutureDraftPicks"
	| "salaryCap"
	| "minPayroll"
	| "luxuryPayroll"
	| "luxuryTax"
	| "minContract"
	| "maxContract"
	| "hardCap"
	| "budget"
	| "aiTradesFactor"
	| "playersRefuseToNegotiate"
	| "injuryRate"
	| "tragicDeathRate"
	| "brotherRate"
	| "sonRate"
	| "homeCourtAdvantage"
	| "rookieContractLengths"
	| "allStarGame"
	| "foulRateFactor"
	| "foulsNeededToFoulOut";

type Category = "League Structure" | "Finance" | "Events" | "Game Simulation";

type FieldType =
	| "bool"
	| "float"
	| "float1000"
	| "int"
	| "jsonString"
	| "string";

type Decoration = "currency" | "percent";

type Values = { [key: string]: string | undefined };

const options: {
	category: Category;
	key: Key;
	name: string;
	type: FieldType;
	decoration?: Decoration;
	helpText?: ReactNode;
	values?: Values;
	validator?: (value: any, output: any, props: View<"godMode">) => void;
}[] = [
	{
		category: "League Structure",
		key: "numGames",
		name: "# Games Per Season",
		type: "int",
		helpText: "This will only apply to seasons that have not started yet.",
	},
	{
		category: "League Structure",
		key: "quarterLength",
		name: "Quarter Length (minutes)",
		type: "float",
	},
	{
		category: "League Structure",
		key: "minRosterSize",
		name: "Min Roster Size",
		type: "int",
		validator: value => {
			if (value < 5) {
				throw new Error("Value cannot be less than 5");
			}
		},
	},
	{
		category: "League Structure",
		key: "maxRosterSize",
		name: "Max Roster Size",
		type: "int",
	},
	{
		category: "League Structure",
		key: "numGamesPlayoffSeries",
		name: "# Playoff Games",
		helpText: (
			<>
				Specify the number of games in each round. You must enter a valid JSON
				array of integers. For example, enter <code>[5,7,1]</code> for a 5 game
				first round series, a 7 game second round series, and a single
				winner-takes-all final game.
			</>
		),
		type: "jsonString",
		validator: (value, output, props) => {
			if (!Array.isArray(value)) {
				throw new Error("Must be an array");
			}
			for (const num of value) {
				if (!Number.isInteger(num)) {
					throw new Error("Array must contain only integers");
				}
			}
			const numRounds = value.length;
			const numPlayoffTeams = 2 ** numRounds - output.numPlayoffByes;
			if (numPlayoffTeams > props.numTeams) {
				throw new Error(
					`${numRounds} playoff rounds with ${output.numPlayoffByes} byes means ${numPlayoffTeams} teams make the playoffs, but there are only ${props.numTeams} teams in the league`,
				);
			}
		},
	},
	{
		category: "League Structure",
		key: "numPlayoffByes",
		name: "# First Round Byes",
		type: "int",
		helpText:
			"Number of playoff teams who will get a bye in the first round. For leagues with two conferences, byes will be split evenly across conferences.",
		validator: value => {
			if (value < 0) {
				throw new Error("Value cannot be less than 0");
			}
		},
	},
	{
		category: "League Structure",
		key: "draftType",
		name: "Draft Type",
		helpText: (
			<>
				<p>Currently this just changes the type of draft lottery.</p>
				<p>NBA 2019 is the current NBA draft lottery.</p>
				<p>
					NBA 1994 is the NBA draft lottery that was used from 1994 to 2018.
				</p>
				<p>No Lottery will order teams based on their record.</p>
				<p>
					Random Order will order the draft completely randomly, with no regard
					for team performance. Each round is randomized independently, so a
					team could get the first pick in one round and the last pick in the
					next round.
				</p>
			</>
		),
		type: "string",
		values: {
			nba2019: "NBA 2019",
			nba1994: "NBA 1994",
			noLottery: "No Lottery",
			random: "Random Order",
		},
	},
	{
		category: "League Structure",
		key: "numSeasonsFutureDraftPicks",
		name: "# Tradable Draft Pick Seasons",
		type: "int",
		helpText:
			"Number of seasons in the future to generate tradable draft picks for. The default value is 4. If you set this to 0, it disables all trading of draft picks.",
		validator: value => {
			if (value < 0) {
				throw new Error("Value cannot be less than 0");
			}
		},
	},
	{
		category: "Finance",
		key: "salaryCap",
		name: "Salary Cap",
		type: "float1000",
		decoration: "currency",
	},
	{
		category: "Finance",
		key: "minPayroll",
		name: "Minimum Payroll",
		type: "float1000",
		decoration: "currency",
	},
	{
		category: "Finance",
		key: "luxuryPayroll",
		name: "Luxury Tax Threshold",
		type: "float1000",
		decoration: "currency",
	},
	{
		category: "Finance",
		key: "luxuryTax",
		name: "Luxury Tax",
		type: "float",
		helpText:
			"Take the difference between a team's payroll and the luxury tax threshold. Multiply that by this number. The result is the penalty they have to pay.",
	},
	{
		category: "Finance",
		key: "minContract",
		name: "Minimum Contract",
		type: "float1000",
		decoration: "currency",
	},
	{
		category: "Finance",
		key: "maxContract",
		name: "Max Contract",
		type: "float1000",
		decoration: "currency",
	},
	{
		category: "Finance",
		key: "hardCap",
		name: "Hard Cap",
		type: "bool",
		helpText: (
			<>
				<p>
					If this is enabled, then you can not exceed the salary cap to sign
					draft picks or re-sign players (like the{" "}
					<a
						href="https://en.wikipedia.org/wiki/NBA_salary_cap#Larry_Bird_exception"
						target="_blank"
						rel="noopener noreferrer"
					>
						Larry Bird exception
					</a>
					) and you can not make trades that result in either team being over
					the salary cap.
				</p>
				<p>
					It is not really a strict hard cap, though. You can still go over the
					cap to sign free agents to minimum contracts, which is to guarantee
					that you never get stuck without enough players.
				</p>
				<p>This also disables the luxury tax.</p>
			</>
		),
	},
	{
		category: "Finance",
		key: "budget",
		name: "Budget",
		type: "bool",
		helpText: (
			<>
				<p>
					By default, an important part of this game is managing your team's
					budget. If you don't make enough profit, you can get fired.
				</p>
				<p>
					If instead you just want to manage the team without worrying about
					that stuff, set this option to "Disabled".
				</p>
				<p>Disabling the budget does a few things:</p>
				<ol>
					<li>
						Hides team cash, revenue, expenses, and profit from various parts of
						the UI.
					</li>
					<li>Stops the owner from caring about profit</li>
					<li>
						Hides the expense categories (scouting, coaching, health,
						facilities) and sets their effects for every team to the league
						average.
					</li>
				</ol>
			</>
		),
	},
	{
		category: "Events",
		key: "aiTradesFactor",
		name: "Trades Between AI Teams Factor",
		type: "float",
		helpText:
			"The baseline rate of trades between AI teams is multiplied by this number. Anything beyond 100 will be both absurd and ridiculously slow.",
	},
	{
		category: "Events",
		key: "playersRefuseToNegotiate",
		name: "Players Can Refuse To Sign With You",
		type: "bool",
	},
	{
		category: "Events",
		key: "injuryRate",
		name: "Injury Rate",
		type: "float",
		helpText: (
			<>
				<p>
					The injury rate is the probability that a player is injured per
					possession.
					{process.env.SPORT === "basketball" ? (
						<>
							{" "}
							Based on{" "}
							<a
								href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3445097/"
								rel="noopener noreferrer"
								target="_blank"
							>
								this article
							</a>{" "}
							there are about 0.25 injuries per team per game, and with 10
							players on the court and ~200 possessions per game, that works out
							to 0.25/10/200 = 0.000125 by default.
						</>
					) : null}
				</p>
				<p>
					This is just an average. Older players have a higher chance of injury
					and younger players have a lower chance of injury.
				</p>
			</>
		),
	},
	{
		category: "Events",
		key: "tragicDeathRate",
		name: "Tragic Death Rate",
		type: "float",
		helpText: (
			<>
				<p>
					The tragic death rate is the probability that a player will die a
					tragic death on a given regular season day. Yes, this only happens in
					the regular season.$
					{process.env.SPORT === "basketball"
						? "  With roughly 100 days in a season, the default is about one death every 50 years, or 1/(50*100) = 0.0002."
						: null}{" "}
					If you set it too high and run out of players, then you'll have to use
					God Mode to either create more or bring some back from the dead.
				</p>
				{process.env.SPORT === "basketball" ? (
					<p>
						If you're using the built-in rosters with real players, please be
						aware that real players can never experience tragic deaths, no
						matter how high you set this.
					</p>
				) : null}
			</>
		),
	},
	{
		category: "Events",
		key: "brotherRate",
		name: "Brother Rate",
		type: "float",
		helpText:
			"The probability that a new player will be the brother of an existing player.",
	},
	{
		category: "Events",
		key: "sonRate",
		name: "Son Rate",
		type: "float",
		helpText:
			"The probability that a new player will be the son of an existing player.",
	},
	{
		category: "Game Simulation",
		key: "homeCourtAdvantage",
		name: "Home Court Advantage",
		type: "float",
		decoration: "percent",
		helpText:
			"This is the percentage boost/penalty given to home/away player ratings. Default is 1%.",
	},
	{
		category: "Finance",
		key: "rookieContractLengths",
		name: "Rookie Contract Lengths",
		helpText: (
			<>
				<p>
					Specify the length of rookie contracts. Different rounds can have
					different lengths. The default is for first round picks to have 3 year
					contracts and second round picks to have 2 year contracts, which looks
					like: <code>[3,2]</code>. If you want every rookie contract to have
					the same length regardless of round, just set one number like{" "}
					<code>[2]</code> - this works because it uses the last value specified
					here for any rounds where you don't define contract length.
				</p>
				<p>
					This only applies if the <b>hard cap option is disabled</b>.
				</p>
			</>
		),
		type: "jsonString",
		validator: (value, output, props) => {
			if (!Array.isArray(value)) {
				throw new Error("Must be an array");
			}
			for (const num of value) {
				if (!Number.isInteger(num)) {
					throw new Error("Array must contain only integers");
				}
			}
			const numRounds = value.length;
			const numPlayoffTeams = 2 ** numRounds - output.numPlayoffByes;
			if (numPlayoffTeams > props.numTeams) {
				throw new Error(
					`${numRounds} playoff rounds with ${output.numPlayoffByes} byes means ${numPlayoffTeams} teams make the playoffs, but there are only ${props.numTeams} teams in the league`,
				);
			}
		},
	},
];

if (process.env.SPORT === "basketball") {
	options.push(
		{
			category: "League Structure",
			key: "allStarGame",
			name: "All-Star Game",
			type: "bool",
			helpText:
				"Changing this will not affect an in-progress season, only future seasons.",
		},
		{
			category: "Game Simulation",
			key: "foulRateFactor",
			name: "Foul Rate Factor",
			type: "float",
			helpText:
				"The baseline rates for shooting and non-shooting fouls are multiplied by this number.",
		},
		{
			category: "Game Simulation",
			key: "foulsNeededToFoulOut",
			name: "# Fouls Needed to Foul Out",
			type: "int",
			validator: value => {
				if (value < 0) {
					throw new Error("Value cannot be less than 0");
				}
			},
		},
	);
}

const encodeDecodeFunctions = {
	bool: {
		stringify: (value: boolean) => String(value),
		parse: (value: string) => value === "true",
	},
	float: {
		stringify: (value: number) => String(value),
		parse: (value: string) => {
			const parsed = parseFloat(value);
			if (Number.isNaN(parsed)) {
				throw new Error(`"${value}" is not a valid number`);
			}
			return parsed;
		},
	},
	float1000: {
		stringify: (value: number) => String(value / 1000),
		parse: (value: string) => {
			const parsed = parseFloat(value) * 1000;
			if (Number.isNaN(parsed)) {
				throw new Error(`"${value}" is not a valid number`);
			}
			return parsed;
		},
	},
	int: {
		stringify: (value: number) => String(value),
		parse: (value: string) => {
			const parsed = parseInt(value, 10);
			if (Number.isNaN(parsed)) {
				throw new Error(`"${value}" is not a valid integer`);
			}
			return parsed;
		},
	},
	string: {},
	jsonString: {
		stringify: (value: any) => JSON.stringify(value),
		parse: (value: string) => JSON.parse(value),
	},
};

const groupedOptions = groupBy(options, "category");

const Input = ({
	decoration,
	disabled,
	onChange,
	type,
	value,
	values,
}: {
	decoration?: Decoration;
	disabled?: boolean;
	onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
	type: FieldType;
	value: string;
	values?: Values;
}) => {
	const commonProps = {
		className: "form-control",
		disabled,
		onChange,
		value,
	};

	let inputElement;
	if (type === "bool") {
		inputElement = (
			<select {...commonProps}>
				<option value="true">Enabled</option>
				<option value="false">Disabled</option>
			</select>
		);
	} else if (values) {
		inputElement = (
			<select {...commonProps}>
				{Object.keys(values).map(key => (
					<option key={key} value={key}>
						{values[key]}
					</option>
				))}
			</select>
		);
	} else {
		inputElement = <input type="text" {...commonProps} />;
	}

	if (decoration === "currency") {
		return (
			<div className="input-group">
				<div className="input-group-prepend">
					<div className="input-group-text">$</div>
				</div>
				{inputElement}
				<div className="input-group-append">
					<div className="input-group-text">M</div>
				</div>
			</div>
		);
	}

	if (decoration === "percent") {
		return (
			<div className="input-group">
				{inputElement}
				<div className="input-group-append">
					<div className="input-group-text">%</div>
				</div>
			</div>
		);
	}

	return inputElement;
};

Input.propTypes = {
	decoration: PropTypes.oneOf(["currency", "percent"]),
	disabled: PropTypes.bool,
	onChange: PropTypes.func.isRequired,
	type: PropTypes.string.isRequired,
	value: PropTypes.string.isRequired,
	values: PropTypes.object,
};

const GodModeOptions = (props: View<"godMode">) => {
	const [submitting, setSubmitting] = useState(false);
	const [state, setState] = useState<Record<Key, string>>(() => {
		// @ts-ignore
		const initialState: Record<Key, string> = {};
		for (const { key, type } of options) {
			const value = props[key];

			// https://github.com/microsoft/TypeScript/issues/21732
			// @ts-ignore
			const stringify = encodeDecodeFunctions[type].stringify;

			initialState[key] = stringify ? stringify(value) : value;
		}
		return initialState;
	});

	const handleChange = (name: string) => (
		event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const value = event.target.value;
		setState(prevState => ({
			...prevState,
			[name]: value,
		}));
	};

	const handleFormSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setSubmitting(true);

		const output: Partial<Record<Key, any>> = {};
		for (const option of options) {
			const { key, name, type } = option;
			const value = state[key];

			// https://github.com/microsoft/TypeScript/issues/21732
			// @ts-ignore
			const parse = encodeDecodeFunctions[type].parse;

			try {
				output[key] = parse ? parse(value) : value;
			} catch (error) {
				setSubmitting(false);
				logEvent({
					type: "error",
					text: `${name}: ${error.message}`,
					saveToDb: false,
					persistent: true,
				});
				return;
			}
		}

		// Run validation functions at the end, so all values are available
		for (const option of options) {
			const { key, name, validator } = option;
			try {
				if (validator) {
					validator(output[key], output, props);
				}
			} catch (error) {
				setSubmitting(false);
				logEvent({
					type: "error",
					text: `${name}: ${error.message}`,
					saveToDb: false,
					persistent: true,
				});
				return;
			}
		}

		await toWorker("main", "updateGameAttributes", output);

		setSubmitting(false);
		logEvent({
			type: "success",
			text: "God Mode options successfully updated.",
			saveToDb: false,
		});
	};

	return (
		<form onSubmit={handleFormSubmit}>
			{Object.entries(groupedOptions).map(([category, catOptions], i) => {
				return (
					<React.Fragment key={category}>
						<h2 className={i === 0 ? "mt-3" : "mt-2"}>{category}</h2>
						<div className="row">
							{catOptions.map(
								({ decoration, helpText, key, name, type, values }) => (
									<div key={key} className="col-sm-3 col-6 form-group">
										<label>
											{name}
											{helpText ? (
												<HelpPopover title={name} className="ml-1">
													{helpText}
												</HelpPopover>
											) : null}
										</label>
										<Input
											type={type}
											disabled={!props.godMode}
											onChange={handleChange(key)}
											value={state[key]}
											values={values}
											decoration={decoration}
										/>
									</div>
								),
							)}
						</div>
					</React.Fragment>
				);
			})}

			<button
				className="btn btn-primary mt-3"
				disabled={!props.godMode || submitting}
			>
				Save God Mode Options
			</button>
		</form>
	);
};

GodModeOptions.propTypes = {
	godMode: PropTypes.bool.isRequired,
	luxuryPayroll: PropTypes.number.isRequired,
	luxuryTax: PropTypes.number.isRequired,
	maxContract: PropTypes.number.isRequired,
	minContract: PropTypes.number.isRequired,
	minPayroll: PropTypes.number.isRequired,
	minRosterSize: PropTypes.number.isRequired,
	maxRosterSize: PropTypes.number.isRequired,
	numGames: PropTypes.number.isRequired,
	numTeams: PropTypes.number.isRequired,
	quarterLength: PropTypes.number.isRequired,
	salaryCap: PropTypes.number.isRequired,
	aiTradesFactor: PropTypes.number.isRequired,
	injuryRate: PropTypes.number.isRequired,
	tragicDeathRate: PropTypes.number.isRequired,
	brotherRate: PropTypes.number.isRequired,
	homeCourtAdvantage: PropTypes.number.isRequired,
	rookieContractLengths: PropTypes.arrayOf(PropTypes.number).isRequired,
	sonRate: PropTypes.number.isRequired,
	hardCap: PropTypes.bool.isRequired,
	numGamesPlayoffSeries: PropTypes.arrayOf(PropTypes.number).isRequired,
	numPlayoffByes: PropTypes.number.isRequired,
	draftType: PropTypes.oneOf(["nba1994", "nba2019", "noLottery", "random"]),
	playersRefuseToNegotiate: PropTypes.bool.isRequired,
	allStarGame: PropTypes.bool.isRequired,
	budget: PropTypes.bool.isRequired,
	numSeasonsFutureDraftPicks: PropTypes.number.isRequired,
	foulRateFactor: PropTypes.number.isRequired,
	foulsNeededToFoulOut: PropTypes.number.isRequired,
};

const GodMode = (props: View<"godMode">) => {
	const { godMode } = props;

	useTitleBar({ title: "God Mode" });

	const handleGodModeToggle = async () => {
		const attrs: {
			godMode: boolean;
			godModeInPast?: true;
		} = { godMode: !godMode };

		if (attrs.godMode) {
			attrs.godModeInPast = true;
		}

		await toWorker("main", "updateGameAttributes", attrs);
		localActions.update({ godMode: attrs.godMode });
	};

	return (
		<>
			<p>
				God Mode is a collection of customization features that allow you to
				kind of do whatever you want. If you enable God Mode, you get access to
				the following features (which show up in the game as{" "}
				<span className="god-mode god-mode-text">purple text</span>
				):
			</p>

			<ul>
				<li>Create custom players by going to Tools > Create A Player</li>
				<li>
					Edit any player by going to their player page and clicking Edit Player
				</li>
				<li>
					Force any trade to be accepted by checking the Force Trade checkbox
					before proposing a trade
				</li>
				<li>
					You can become the GM of another team at any time with Tools > Switch
					Team
				</li>
				<li>Add, remove and edit teams with Tools > Manage Teams</li>
				<li>You will never be fired!</li>
				<li>You will be able to change the options below</li>
			</ul>

			<p>
				However, if you enable God Mode within a league, you will not get credit
				for any <a href="/account">Achievements</a>. This persists even if you
				disable God Mode. You can only get Achievements in a league where God
				Mode has never been enabled.
			</p>

			<button
				className={classNames("btn", godMode ? "btn-success" : "btn-danger")}
				onClick={handleGodModeToggle}
			>
				{godMode ? "Disable God Mode" : "Enable God Mode"}
			</button>

			<h1 className="mt-3">God Mode Options</h1>

			<p className="text-danger">
				These options are not well tested and might make the AI do weird things.
			</p>

			<GodModeOptions {...props} />
		</>
	);
};

GodMode.propTypes = GodModeOptions.propTypes;

export default GodMode;
