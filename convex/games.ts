import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

function generateCode(): string {
  const words = [
    "ROCK",
    "BEAT",
    "METL",
    "RETRO",
    "ALT",
    "GOTH",
    "TUNE",
    "SONG",
    "BAND",
    "JAZZ",
    "SOUL",
    "FUNK",
    "BASS",
    "DRUM",
    "PUNK",
    "VIBE",
    "CHIC",
    "TECH",
    "LOUD",
    "HYPE",
    "PLAY",
    "WILD",
    "MEGA",
    "SOUL",
    "RAVE",
    "BOOM",
    "KICK",
    "SPIN",
    "GLAM",
  ];

  const word = words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(Math.random() * 900) + 100;

  return `${word}${number}`;
}

export const get = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db.get(gameId);
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    return await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
  },
});

export const create = mutation({
  args: {
    hostId: v.string(),
    settings: v.object({
      roundCount: v.number(),
      secondsPerRound: v.number(),
    }),
  },
  handler: async (ctx, { hostId, settings }) => {
    let code = generateCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await ctx.db
        .query("games")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();

      if (!existing) break;

      code = generateCode();
      attempts++;
    }

    if (attempts === maxAttempts) {
      throw new Error("Failed to generate unique code. Please try again.");
    }

    const gameId = await ctx.db.insert("games", {
      code,
      hostId,
      status: "lobby",
      currentRound: 0,
      settings,
      createdAt: Date.now(),
    });

    return { gameId, code };
  },
});

export const start = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");

    // Delete any existing rounds (in case game was restarted)
    const existingRounds = await ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();

    for (const round of existingRounds) {
      await ctx.db.delete(round._id);
    }

    // Create fresh rounds
    await ctx.runMutation(internal.rounds.createTestRounds, {
      gameId,
      count: game.settings.roundCount,
    });

    await ctx.db.patch(gameId, {
      status: "playing",
      currentRound: 0,
    });

    const firstRound = await ctx.db
      .query("rounds")
      .withIndex("by_game_and_number", (q) =>
        q.eq("gameId", gameId).eq("roundNumber", 0),
      )
      .first();

    if (firstRound) {
      await ctx.db.patch(firstRound._id, { startedAt: Date.now() });
    }
  },
});

export const nextRound = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");

    const currentRoundNum = game.currentRound;
    const nextRoundNum = game.currentRound + 1;

    const currentRound = await ctx.db
      .query("rounds")
      .withIndex("by_game_and_number", (q) =>
        q.eq("gameId", gameId).eq("roundNumber", currentRoundNum),
      )
      .first();

    if (currentRound) {
      await ctx.db.patch(currentRound._id, { endedAt: Date.now() });
    }

    const nextRound = await ctx.db
      .query("rounds")
      .withIndex("by_game_and_number", (q) =>
        q.eq("gameId", gameId).eq("roundNumber", nextRoundNum),
      )
      .first();

    if (nextRound) {
      await ctx.db.patch(nextRound._id, { startedAt: Date.now() });
      await ctx.db.patch(gameId, {
        currentRound: nextRoundNum,
      });
    } else {
      await ctx.db.patch(gameId, { status: "finished" });
    }
  },
});
