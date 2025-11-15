import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";

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
      playlistTag: v.optional(v.string()),
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

export const updateSettings = mutation({
  args: {
    gameId: v.id("games"),
    settings: v.object({
      roundCount: v.number(),
      secondsPerRound: v.number(),
      playlistTag: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { gameId, settings }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");

    if (game.status !== "lobby") {
      throw new Error("Cannot update settings after game has started");
    }

    await ctx.db.patch(gameId, { settings });
  },
});

export const start = action({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    // Get game to check settings
    const game = await ctx.runQuery(api.games.get, { gameId });
    if (!game) throw new Error("Game not found");

    // Check if rounds already exist
    const existingRounds = await ctx.runQuery(api.rounds.list, { gameId });

    // Create rounds if they don't exist (fetches from Spotify)
    if (existingRounds.length === 0) {
      await ctx.runAction(internal.rounds.createTestRounds, {
        gameId,
        count: game.settings.roundCount,
        playlistTag: game.settings.playlistTag || "daily-songs",
      });
    }

    // Update game status to playing
    await ctx.runMutation(internal.games.startGame, { gameId });
  },
});

export const startGame = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    // Set game to playing
    await ctx.db.patch(gameId, {
      status: "playing",
      currentRound: 0,
    });

    // Find and start the first round
    const firstRound = await ctx.db
      .query("rounds")
      .withIndex("by_game_and_number", (q) =>
        q.eq("gameId", gameId).eq("roundNumber", 0),
      )
      .first();

    if (firstRound) {
      // Start the first round with scheduled phase transitions
      await ctx.runMutation(internal.roundScheduler.startRound, {
        roundId: firstRound._id,
      });
    }
  },
});

export const nextRound = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");

    const currentRoundNum = game.currentRound;

    const currentRound = await ctx.db
      .query("rounds")
      .withIndex("by_game_and_number", (q) =>
        q.eq("gameId", gameId).eq("roundNumber", currentRoundNum),
      )
      .first();

    if (currentRound) {
      // Manually trigger the transition to ended (which will auto-start next round)
      await ctx.runMutation(internal.roundScheduler.transitionToEnded, {
        roundId: currentRound._id,
      });
    }
  },
});
