import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
  },
});

export const getBySession = query({
  args: {
    gameId: v.id("games"),
    sessionId: v.string(),
  },
  handler: async (ctx, { gameId, sessionId }) => {
    return await ctx.db
      .query("players")
      .withIndex("by_session", (q) =>
        q.eq("gameId", gameId).eq("sessionId", sessionId),
      )
      .first();
  },
});

export const join = mutation({
  args: {
    code: v.string(),
    sessionId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, { code, sessionId, name }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!game) {
      throw new Error("Game not found. Check the code and try again.");
    }

    const existing = await ctx.db
      .query("players")
      .withIndex("by_session", (q) =>
        q.eq("gameId", game._id).eq("sessionId", sessionId),
      )
      .first();

    if (existing) {
      return existing._id;
    }

    const isHost = game.hostId === sessionId;

    const playerId = await ctx.db.insert("players", {
      gameId: game._id,
      sessionId,
      name,
      score: 0,
      isHost,
      ready: false,
      joinedAt: Date.now(),
    });

    return playerId;
  },
});

export const leave = mutation({
  args: {
    gameId: v.id("games"),
    sessionId: v.string(),
  },
  handler: async (ctx, { gameId, sessionId }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_session", (q) =>
        q.eq("gameId", gameId).eq("sessionId", sessionId),
      )
      .first();

    if (player) {
      await ctx.db.delete(player._id);
    }
  },
});

export const toggleReady = mutation({
  args: {
    gameId: v.id("games"),
    sessionId: v.string(),
  },
  handler: async (ctx, { gameId, sessionId }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_session", (q) =>
        q.eq("gameId", gameId).eq("sessionId", sessionId),
      )
      .first();

    if (!player) {
      throw new Error("Player not found");
    }

    await ctx.db.patch(player._id, {
      ready: !(player.ready ?? false),
    });
  },
});
