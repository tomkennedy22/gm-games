/**
 * @name core.draft
 * @namespace The annual draft of new prospects.
 */
define(["db", "globals", "core/finances", "core/player", "core/season", "core/team", "util/helpers", "util/random"], function (db, g, finances, player, season, team, helpers, random) {
    "use strict";

    /**
     * Retrieve the current remaining draft order.
     *
     * @memberOf core.draft
     * @param {function(Array.<Object>)} cb Callback function whose argument is an ordered array of pick objects.
     */
    function getOrder(cb) {
        g.dbl.transaction("draftOrder").objectStore("draftOrder").get(0).onsuccess = function (event) {
            var draftOrder;

            draftOrder = event.target.result.draftOrder;
            cb(draftOrder);
        };
    }

    /**
     * Save draft order for future picks to the database.
     *
     * @memberOf core.draft
     * @param {Array.<Object>} draftOrder Ordered array of pick objects, as generated by genOrder.
     * @param {function()=} cb Optional callback function.
     */
    function setOrder(draftOrder, cb) {
        var tx;

        tx = g.dbl.transaction("draftOrder", "readwrite");
        tx.objectStore("draftOrder").put({
            rid: 0,
            draftOrder: draftOrder
        });
        tx.oncomplete = function () {
            if (cb !== undefined) {
                cb();
            }
        };
    }

    /**
     * Generate a set of draft prospects.
     *
     * This is called before the draft occurs, otherwise there will be no one to draft!
     *
     * @memberOf core.draft
     * @param {function()} cb Callback function.
     */
    function genPlayers(cb) {
        g.dbl.transaction("teams").objectStore("teams").get(g.userTid).onsuccess = function (event) {
            var agingYears, baseRating, draftYear, i, p, playerStore, pot, profile, profiles, scoutingRank, t, tx;

            t = event.target.result;
            scoutingRank = finances.getRankLastThree(t, "expenses", "scouting");

            tx = g.dbl.transaction("players", "readwrite");
            playerStore = tx.objectStore("players");

            profiles = ["Point", "Wing", "Big", "Big", ""];
            for (i = 0; i < 70; i++) {
                baseRating = random.randInt(8, 33);
                pot = parseInt(random.gauss(50, 20), 10);
                if (pot < baseRating) {
                    pot = baseRating;
                }
                if (pot > 90) {
                    pot = 90;
                }

                profile = profiles[random.randInt(0, profiles.length - 1)];
                agingYears = random.randInt(0, 3);
                draftYear = g.season;

                p = player.generate(g.PLAYER.UNDRAFTED, 19, profile, baseRating, pot, draftYear, false, scoutingRank);
                p = player.develop(p, agingYears, true);

                playerStore.put(p);
            }

            tx.oncomplete = cb;
        };
    }

    /**
     * Sets draft order and save it to the draftOrder object store.
     *
     * This is currently based on an NBA-like lottery, where the first 3 picks can be any of the non-playoff teams (with weighted probabilities).
     *
     * @memberOf core.draft
     * @param {function()=} cb Optional callback function.
     */
    function genOrder(cb) {
        team.filter({
            attrs: ["tid", "abbrev", "name", "cid"],
            seasonAttrs: ["winp", "playoffRoundsWon"],
            season: g.season
        }, function (teams) {
            var chances, draftOrder, draw, firstThree, i, pick;
            draftOrder = [];

            // Sort teams by playoffs and winp, for first round
            teams.sort(function (a, b) {
                if (a.playoffRoundsWon < b.playoffRoundsWon) {
                    return -1;
                }
                if (a.playoffRoundsWon > b.playoffRoundsWon) {
                    return 1;
                }
                return a.winp - b.winp;
            });

            // Draft lottery
            chances = [250, 199, 156, 119, 88, 63, 43, 28, 17, 11, 8, 7, 6, 5];
            // cumsum
            for (i = 1; i < chances.length; i++) {
                chances[i] = chances[i] + chances[i - 1];
            }
            // Pick first three picks based on chances
            firstThree = [];
            while (firstThree.length < 3) {
                draw = random.randInt(1, 1000);
                for (i = 0; i < chances.length; i++) {
                    if (chances[i] > draw) {
                        break;
                    }
                }
                if (firstThree.indexOf(i) < 0) {
                    firstThree.push(i);
                }
            }

            // First round - lottery winners
            for (i = 0; i < firstThree.length; i++) {
                draftOrder.push({round: 1, pick: i + 1, tid: teams[firstThree[i]].tid, abbrev: teams[firstThree[i]].abbrev});
            }

            // First round - everyone else
            pick = 4;
            for (i = 0; i < teams.length; i++) {
                if (firstThree.indexOf(i) < 0) {
                    draftOrder.push({round: 1, pick: pick, tid: teams[i].tid, abbrev: teams[i].abbrev});
                    pick += 1;
                }
            }

            // Sort teams by winp only, for second round
            teams.sort(function (a, b) { return a.winp - b.winp; });

            // Second round
            for (i = 0; i < teams.length; i++) {
                draftOrder.push({round: 2, pick: i + 1, tid: teams[i].tid, abbrev: teams[i].abbrev});
            }

            setOrder(draftOrder, cb);
        });
    }

    /**
     * Select a player for the current drafting team.
     *
     * This can be called in response to the user clicking the "draft" button for a player, or by some other function like untilUserOrEnd.
     *
     * @memberOf core.draft
     * @param {object} pick Pick object, like from getOrder, that contains information like the team, round, etc.
     * @param {number} pid Integer player ID for the player to be drafted.
     * @param {function(<number>)=} cb Optional callback function. Argument is the player ID that was drafted (same as pid input.. probably this can be eliminated, then).
     */
    function selectPlayer(pick, pid, cb) {
        var tx;
/*        // Validate that tid should be picking now
        r = g.dbex('SELECT tid, round, pick FROM draftResults WHERE season = :season AND pid = 0 ORDER BY round, pick ASC LIMIT 1', season=g.season);
        tidNext, round, pick = r.fetchone();

        if (tidNext != pick.tid) {
            app.logger.debug('WARNING: Team %d tried to draft out of order' % (tid,));
            return;*/

        tx = g.dbl.transaction("players", "readwrite");
        tx.objectStore("players").openCursor(pid).onsuccess = function (event) {
            var cursor, i, p, rookieSalaries, teams, years;

            cursor = event.target.result;
            p = cursor.value;

            // Draft player
            p.tid = pick.tid;
            teams = helpers.getTeams();
            p.draft = {
                round: pick.round,
                pick: pick.pick,
                tid: pick.tid,
                year: g.season,
                abbrev: teams[pick.tid].abbrev,
                // draftTeamName and draftTeamRegion are currently not used, but they don't do much harm
                teamName: teams[pick.tid].name,
                teamRegion: teams[pick.tid].region,
                pot: p.ratings[0].pot,
                ovr: p.ratings[0].ovr,
                skills: p.ratings[0].skills
            };

            // Contract
            rookieSalaries = [5000, 4500, 4000, 3500, 3000, 2750, 2500, 2250, 2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500];
            i = pick.pick - 1 + 30 * (pick.round - 1);
            years = 4 - pick.round;  // 2 years for 2nd round, 3 years for 1st round;
            p = player.setContract(p, {
                amount: rookieSalaries[i],
                exp: g.season + years
            }, true);

            cursor.update(p);
        };

        tx.oncomplete = function () {
            if (cb !== undefined) {
                cb(pid);
            }
        };
    }

    /**
     * Simulate draft picks until it's the user's turn or the draft is over.
     *
     * This could be made faster by passing a transaction around, so all the writes for all the picks are done in one transaction. But when calling selectPlayer elsewhere (i.e. in testing or in response to the user's pick), it needs to be sure that the transaction is complete before continuing. So I would need to create a special case there to account for it. Given that this isn't really *that* slow now, that probably isn't worth the complexity. Although... team.rosterAutoSort does precisely this... so maybe it would be a good idea...
     *
     * @memberOf core.draft
     * @param {function(Array.<Object>, Array.<number>)} cb Callback function. First argument is the list of draft picks (from getOrder). Second argument is a list of player IDs who were drafted during this function call, in order.
     */
    function untilUserOrEnd(cb) {
        var pids;

        pids = [];

        g.dbl.transaction("players").objectStore("players").index("tid").getAll(g.PLAYER.UNDRAFTED).onsuccess = function (event) {
            var playersAll;

            playersAll = event.target.result;
            playersAll.sort(function (a, b) {  return (b.ratings[0].ovr + 2 * b.ratings[0].pot) - (a.ratings[0].ovr + 2 * a.ratings[0].pot); });

            getOrder(function (draftOrder) {
                var autoSelectPlayer, cbAfterDoneAuto, pick, pid, selection;

                // Called after either the draft is over or it's the user's pick
                cbAfterDoneAuto = function (draftOrder, pids) {
                    setOrder(draftOrder, function () {
                        var season;

                        // Is draft over?;
                        if (draftOrder.length === 0) {
                            season = require("core/season"); // Circular reference
                            season.newPhase(g.PHASE.AFTER_DRAFT, function () {
                                cb(pids);
                            });
                        } else {
                            db.setGameAttributes({lastDbChange: Date.now()}, function () {
                                cb(pids);
                            });
                        }
                    });
                };

                // This will actually draft "untilUserOrEnd"
                autoSelectPlayer = function () {
                    var cb;

                    if (draftOrder.length > 0) {
                        pick = draftOrder.shift();
                        if (pick.tid === g.userTid) {
                            draftOrder.unshift(pick);
                            cbAfterDoneAuto(draftOrder, pids);
                            return;
                        }

                        selection = Math.floor(Math.abs(random.gauss(0, 2)));  // 0=best prospect, 1=next best prospect, etc.
                        pid = playersAll[selection].pid;
                        selectPlayer(pick, pid, function () {
                            pids.push(pid);
                            playersAll.splice(selection, 1);  // Delete from the list of undrafted players

                            autoSelectPlayer();
                        });
                    } else {
                        cbAfterDoneAuto(draftOrder, pids);
                    }
                };

                autoSelectPlayer();
            });
        };
    }

    return {
        getOrder: getOrder,
        setOrder: setOrder,
        genPlayers: genPlayers,
        genOrder: genOrder,
        untilUserOrEnd: untilUserOrEnd,
        selectPlayer: selectPlayer
    };
});
