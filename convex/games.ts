import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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
