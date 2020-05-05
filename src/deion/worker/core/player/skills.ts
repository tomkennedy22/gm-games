import compositeRating from "./compositeRating";
import { overrides } from "../../util";
import type { MinimalPlayerRatings } from "../../../common/types";

const hasSkill = (
	ratings: MinimalPlayerRatings,
	components: (string | number)[],
	weights?: number[],
	cutoff: number = 0.61,
): boolean => {
	return compositeRating(ratings, components, weights, true) > cutoff;
};

/**
 * Assign "skills" based on ratings.
 *
 * "Skills" are discrete categories, like someone is a 3 point shooter or they aren't. These are displayed next to the player's name generally, and are also used in game simulation. The possible skills are:
 *
 * * Three Point Shooter (3)
 * * Athlete (A)
 * * Ball Handler (B)
 * * Interior Defender (Di)
 * * Perimeter Defender (Dp)
 * * Post Scorer (Po)
 * * Passer (Ps)
 * * Rebounder (R)
 *
 * There should be about 30 (number of teams) players with each skill, except 3 point shooting which should have 60.
 *
 * Keep cutoffs in sync with GameSim.js!
 */
const skills = (playerRatings: MinimalPlayerRatings) => {
	const sk: string[] = [];

	for (const key of Object.keys(overrides.common.constants.COMPOSITE_WEIGHTS)) {
		const {
			ratings,
			skill,
			weights,
		} = overrides.common.constants.COMPOSITE_WEIGHTS[key];

		if (skill) {
			if (hasSkill(playerRatings, ratings, weights, skill.cutoff)) {
				sk.push(skill.label);
			}
		}
	}

	sk.sort();
	return sk;
};

export default skills;
