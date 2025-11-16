import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get today's date in UTC as YYYY-MM-DD format
 */
export function getTodaysDate(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get deterministic seed for daily song selection
 * Same date = same seed = same songs globally
 */
export const getDailySeed = query({
  args: {},
  handler: async () => {
    const date = getTodaysDate();
    return `daily-${date}`;
  },
});

/**
 * Submit or update a player's daily score
 * Only keeps the best score per player per day
 */
export const submitDailyScore = mutation({
  args: {
    playerId: v.string(),
    playerName: v.string(),
    score: v.number(),
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const date = getTodaysDate();

    // Check if player already has a score for today
    const existingScore = await ctx.db
      .query("dailyScores")
      .withIndex("by_player_and_date", (q) =>
        q.eq("playerId", args.playerId).eq("date", date)
      )
      .first();

    // If existing score is better, don't update
    if (existingScore && existingScore.score >= args.score) {
      return { updated: false, scoreId: existingScore._id };
    }

    // If existing score is worse, update it
    if (existingScore) {
      await ctx.db.patch(existingScore._id, {
        score: args.score,
        playerName: args.playerName,
        completedAt: Date.now(),
        gameId: args.gameId,
      });
      return { updated: true, scoreId: existingScore._id };
    }

    // No existing score, create new one
    const scoreId = await ctx.db.insert("dailyScores", {
      date,
      playerId: args.playerId,
      playerName: args.playerName,
      score: args.score,
      completedAt: Date.now(),
      gameId: args.gameId,
    });

    return { updated: true, scoreId };
  },
});

/**
 * Get leaderboard for a specific date
 * Returns top scores sorted by score descending
 */
export const getDailyLeaderboard = query({
  args: {
    date: v.optional(v.string()), // If not provided, uses today
    limit: v.optional(v.number()), // Default 100
  },
  handler: async (ctx, args) => {
    const date = args.date || getTodaysDate();
    const limit = args.limit || 100;

    const scores = await ctx.db
      .query("dailyScores")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();

    // Sort by score descending, then by completedAt ascending (earlier is better for ties)
    const sortedScores = scores
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.completedAt - b.completedAt;
      })
      .slice(0, limit);

    return sortedScores;
  },
});

/**
 * Get a specific player's score for a specific date
 */
export const getPlayerDailyScore = query({
  args: {
    playerId: v.string(),
    date: v.optional(v.string()), // If not provided, uses today
  },
  handler: async (ctx, args) => {
    const date = args.date || getTodaysDate();

    const score = await ctx.db
      .query("dailyScores")
      .withIndex("by_player_and_date", (q) =>
        q.eq("playerId", args.playerId).eq("date", date)
      )
      .first();

    return score;
  },
});

/**
 * Get player's rank on the leaderboard for a specific date
 */
export const getPlayerRank = query({
  args: {
    playerId: v.string(),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const date = args.date || getTodaysDate();

    const playerScore = await ctx.db
      .query("dailyScores")
      .withIndex("by_player_and_date", (q) =>
        q.eq("playerId", args.playerId).eq("date", date)
      )
      .first();

    if (!playerScore) {
      return null;
    }

    const allScores = await ctx.db
      .query("dailyScores")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();

    // Sort by score descending, then by completedAt ascending
    const sortedScores = allScores.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.completedAt - b.completedAt;
    });

    const rank = sortedScores.findIndex((s) => s._id === playerScore._id) + 1;
    const totalPlayers = sortedScores.length;

    return {
      rank,
      totalPlayers,
      score: playerScore.score,
    };
  },
});

/**
 * Get player's stats (streak, total days played, etc.)
 */
export const getPlayerStats = query({
  args: {
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query("playerStats")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .first();

    return stats;
  },
});

/**
 * Update player's streak after completing daily challenge
 */
export const updateStreak = mutation({
  args: {
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const today = getTodaysDate();

    // Get existing stats
    const existingStats = await ctx.db
      .query("playerStats")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .first();

    if (!existingStats) {
      // First time playing - create new stats
      await ctx.db.insert("playerStats", {
        playerId: args.playerId,
        currentStreak: 1,
        longestStreak: 1,
        lastPlayedDate: today,
        totalDaysPlayed: 1,
      });
      return { currentStreak: 1, longestStreak: 1 };
    }

    // Check if already played today
    if (existingStats.lastPlayedDate === today) {
      // Already played today, don't update streak
      return {
        currentStreak: existingStats.currentStreak,
        longestStreak: existingStats.longestStreak,
      };
    }

    // Calculate if yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const [year, month, day] = yesterdayStr.split('-');
    const formattedYesterday = `${year}-${month}-${day}`;

    const playedYesterday = existingStats.lastPlayedDate === formattedYesterday;

    let newStreak: number;
    if (playedYesterday) {
      // Continue streak
      newStreak = existingStats.currentStreak + 1;
    } else {
      // Streak broken, restart at 1
      newStreak = 1;
    }

    const newLongestStreak = Math.max(newStreak, existingStats.longestStreak);

    await ctx.db.patch(existingStats._id, {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastPlayedDate: today,
      totalDaysPlayed: existingStats.totalDaysPlayed + 1,
    });

    return {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
    };
  },
});
