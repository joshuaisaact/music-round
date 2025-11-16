import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const submitScore = mutation({
  args: {
    playerId: v.string(),
    playerName: v.string(),
    score: v.number(),
    roundsCompleted: v.number(),
    livesRemaining: v.number(),
    gameId: v.id("games"),
    playlistTag: v.string(),
  },
  handler: async (ctx, { playerId, playerName, score, roundsCompleted, livesRemaining, gameId, playlistTag }) => {
    // Check if player already has a score for this playlist
    const existing = await ctx.db
      .query("battleRoyaleScores")
      .withIndex("by_player_and_playlist", (q) =>
        q.eq("playerId", playerId).eq("playlistTag", playlistTag)
      )
      .first();

    // Only keep the best score (highest rounds completed, then highest score)
    if (existing) {
      const isBetter =
        roundsCompleted > existing.roundsCompleted ||
        (roundsCompleted === existing.roundsCompleted && score > existing.score);

      if (isBetter) {
        await ctx.db.patch(existing._id, {
          playerName,
          score,
          roundsCompleted,
          livesRemaining,
          completedAt: Date.now(),
          gameId,
        });
      }
    } else {
      await ctx.db.insert("battleRoyaleScores", {
        playlistTag,
        playerId,
        playerName,
        score,
        roundsCompleted,
        livesRemaining,
        completedAt: Date.now(),
        gameId,
      });
    }
  },
});

export const getLeaderboard = query({
  args: {
    playlistTag: v.string(),
  },
  handler: async (ctx, { playlistTag }) => {
    const scores = await ctx.db
      .query("battleRoyaleScores")
      .withIndex("by_playlist", (q) => q.eq("playlistTag", playlistTag))
      .collect();

    // Sort by rounds completed (desc), then score (desc), then completion time (asc)
    return scores
      .sort((a, b) => {
        if (b.roundsCompleted !== a.roundsCompleted) {
          return b.roundsCompleted - a.roundsCompleted;
        }
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.completedAt - b.completedAt;
      })
      .slice(0, 100);
  },
});

export const getPlayerScore = query({
  args: {
    playerId: v.string(),
    playlistTag: v.string(),
  },
  handler: async (ctx, { playerId, playlistTag }) => {
    return await ctx.db
      .query("battleRoyaleScores")
      .withIndex("by_player_and_playlist", (q) =>
        q.eq("playerId", playerId).eq("playlistTag", playlistTag)
      )
      .first();
  },
});

export const getPlayerRank = query({
  args: {
    playerId: v.string(),
    playlistTag: v.string(),
  },
  handler: async (ctx, { playerId, playlistTag }) => {
    const playerScore = await ctx.db
      .query("battleRoyaleScores")
      .withIndex("by_player_and_playlist", (q) =>
        q.eq("playerId", playerId).eq("playlistTag", playlistTag)
      )
      .first();

    if (!playerScore) {
      return null;
    }

    // Get all scores for this playlist
    const allScores = await ctx.db
      .query("battleRoyaleScores")
      .withIndex("by_playlist", (q) => q.eq("playlistTag", playlistTag))
      .collect();

    // Sort by rounds completed (desc), then score (desc), then completion time (asc)
    const sorted = allScores.sort((a, b) => {
      if (b.roundsCompleted !== a.roundsCompleted) {
        return b.roundsCompleted - a.roundsCompleted;
      }
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.completedAt - b.completedAt;
    });

    const rank = sorted.findIndex((s) => s._id === playerScore._id) + 1;

    return {
      rank,
      totalPlayers: allScores.length,
      score: playerScore.score,
      roundsCompleted: playerScore.roundsCompleted,
      livesRemaining: playerScore.livesRemaining,
    };
  },
});
