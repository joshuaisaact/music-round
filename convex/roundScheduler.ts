import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

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

    const nextRoundNum = game.currentRound + 1;
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
      // No more rounds, end the game
      await ctx.db.patch(game._id, { status: "finished" });
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
