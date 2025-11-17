import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

const PREPARING_DURATION_MS = 3000; // 3 seconds

export const transitionToActive = internalMutation({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, { roundId }) => {
    const round = await ctx.db.get(roundId);
    if (!round) return;

    if (round.phase !== "preparing") {
      return;
    }

    // Update round to active phase
    await ctx.db.patch(roundId, {
      phase: "active",
      activeAt: Date.now(),
    });

    // Get game settings to know how long the active phase should last
    const game = await ctx.db.get(round.gameId);
    if (!game) return;

    // Schedule transition to ended phase
    const endTime = Date.now() + game.settings.secondsPerRound * 1000;
    await ctx.scheduler.runAt(endTime, internal.roundScheduler.transitionToEnded, {
      roundId,
    });
  },
});

export const transitionToEnded = internalMutation({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, { roundId }) => {
    const round = await ctx.db.get(roundId);
    if (!round) return;

    if (round.phase === "ended") {
      return;
    }

    // Update round to ended phase
    await ctx.db.patch(roundId, {
      phase: "ended",
      endedAt: Date.now(),
    });

    // Auto-advance to next round
    const game = await ctx.db.get(round.gameId);
    if (!game) return;

    // Handle battle royale elimination logic
    if (game.settings.gameMode === "battle_royale") {
      // Get all players in the game
      const allPlayers = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", game._id))
        .collect();

      // Get all answers for this round
      const answers = await ctx.db
        .query("answers")
        .withIndex("by_round", (q) => q.eq("roundId", roundId))
        .collect();

      // Check each player's answer and handle lives
      const playerUpdates = allPlayers
        .filter(player => !player.eliminated)
        .map((player) => {
          const answer = answers.find((a) => a.playerId === player._id);

          // Determine correctness
          const isFullyCorrect = answer?.artistCorrect && answer?.titleCorrect;
          const isBothWrong = answer && !answer.artistCorrect && !answer.titleCorrect;

          // Rule 1: Both wrong = eliminated immediately
          if (isBothWrong) {
            return ctx.db.patch(player._id, {
              lives: 0,
              eliminated: true,
              eliminatedAtRound: round.roundNumber,
            });
          }

          // Rule 2: One wrong or no answer = lose 1 life
          if (!isFullyCorrect) {
            const currentLives = player.lives ?? 3;
            const newLives = currentLives - 1;

            if (newLives <= 0) {
              // Player is eliminated
              return ctx.db.patch(player._id, {
                lives: 0,
                eliminated: true,
                eliminatedAtRound: round.roundNumber,
              });
            } else {
              // Player loses a life but continues
              return ctx.db.patch(player._id, {
                lives: newLives,
                eliminated: false, // Explicitly ensure not eliminated
              });
            }
          }

          // Fully correct - no update needed
          return null;
        })
        .filter((update): update is Promise<any> => update !== null);

      await Promise.all(playerUpdates);

      // Re-fetch players to get updated elimination status
      const updatedPlayers = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", game._id))
        .collect();

      // Check if game should end
      const remainingPlayers = updatedPlayers.filter((p) => !p.eliminated);

      // For single player: only end if player is eliminated (0 remaining)
      // For multiplayer: end if 1 or fewer remain
      const isSinglePlayer = game.settings.isSinglePlayer ?? false;
      const shouldEndGame = isSinglePlayer
        ? remainingPlayers.length === 0
        : remainingPlayers.length <= 1;

      if (shouldEndGame) {
        // Game over - mark as finished
        await ctx.db.patch(game._id, { status: "finished" });
        return; // Don't advance to next round
      }
    }

    const nextRoundNum = game.currentRound + 1;

    // Check if we've hit the max round limit for battle royale
    if (game.settings.gameMode === "battle_royale" && nextRoundNum >= game.settings.roundCount) {
      // Hit the round limit, end the game
      await ctx.db.patch(game._id, { status: "finished" });
      return;
    }

    const nextRound = await ctx.db
      .query("rounds")
      .withIndex("by_game_and_number", (q) =>
        q.eq("gameId", game._id).eq("roundNumber", nextRoundNum),
      )
      .first();

    if (nextRound) {
      // Start next round in preparing phase
      await ctx.db.patch(nextRound._id, {
        phase: "preparing",
        startedAt: Date.now(),
      });

      // Update game current round
      await ctx.db.patch(game._id, {
        currentRound: nextRoundNum,
      });

      // Schedule transition to active
      const activeTime = Date.now() + PREPARING_DURATION_MS;
      await ctx.scheduler.runAt(
        activeTime,
        internal.roundScheduler.transitionToActive,
        { roundId: nextRound._id },
      );
    } else {
      // For battle royale, create next round on-demand
      if (game.settings.gameMode === "battle_royale") {
        await ctx.scheduler.runAfter(0, internal.roundScheduler.createNextRound, {
          gameId: game._id,
          roundNumber: nextRoundNum,
        });
      } else {
        // No more rounds, end the game
        await ctx.db.patch(game._id, { status: "finished" });
      }
    }
  },
});

export const startRound = internalMutation({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, { roundId }) => {
    const round = await ctx.db.get(roundId);
    if (!round) return;

    if (round.phase) {
      return;
    }

    // Start round in preparing phase
    await ctx.db.patch(roundId, {
      phase: "preparing",
      startedAt: Date.now(),
    });

    // Schedule transition to active phase
    const activeTime = Date.now() + PREPARING_DURATION_MS;
    await ctx.scheduler.runAt(
      activeTime,
      internal.roundScheduler.transitionToActive,
      { roundId },
    );
  },
});

export const createNextRound = internalAction({
  args: {
    gameId: v.id("games"),
    roundNumber: v.number(),
  },
  handler: async (ctx, { gameId, roundNumber }) => {
    // Create a single round on-demand for battle royale
    const game = await ctx.runQuery(api.games.get, { gameId });
    if (!game) return;

    // Create the next round
    await ctx.runAction(internal.rounds.createTestRounds, {
      gameId,
      count: 1,
      playlistTag: game.settings.playlistTag || "daily-songs",
      startingRoundNumber: roundNumber,
    });

    // Get the newly created round
    const newRound = await ctx.runQuery(api.rounds.getCurrent, {
      gameId,
      roundNumber,
    });

    if (newRound) {
      // Start the round
      await ctx.runMutation(internal.roundScheduler.startNextRoundAfterCreation, {
        gameId,
        roundId: newRound._id,
        roundNumber,
      });
    }
  },
});

export const startNextRoundAfterCreation = internalMutation({
  args: {
    gameId: v.id("games"),
    roundId: v.id("rounds"),
    roundNumber: v.number(),
  },
  handler: async (ctx, { gameId, roundId, roundNumber }) => {
    // Start round in preparing phase
    await ctx.db.patch(roundId, {
      phase: "preparing",
      startedAt: Date.now(),
    });

    // Update game current round
    await ctx.db.patch(gameId, {
      currentRound: roundNumber,
    });

    // Schedule transition to active
    const activeTime = Date.now() + PREPARING_DURATION_MS;
    await ctx.scheduler.runAt(
      activeTime,
      internal.roundScheduler.transitionToActive,
      { roundId },
    );
  },
});
