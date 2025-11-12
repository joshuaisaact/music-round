import { v } from "convex/values";
import { query, internalMutation, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

export const list = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
  },
});

export const getCurrent = query({
  args: {
    gameId: v.id("games"),
    roundNumber: v.number(),
  },
  handler: async (ctx, { gameId, roundNumber }) => {
    return await ctx.db
      .query("rounds")
      .withIndex("by_game_and_number", (q) =>
        q.eq("gameId", gameId).eq("roundNumber", roundNumber),
      )
      .first();
  },
});

export const createTestRounds = internalAction({
  args: { gameId: v.id("games"), count: v.number() },
  handler: async (ctx, { gameId, count }) => {
    const randomSongs = await ctx.runQuery(api.songs.getRandomSongs, {
      count,
    });

    const songs = [];

    for (let i = 0; i < randomSongs.length; i++) {
      const { artist, title } = randomSongs[i];

      try {
        const songData = await ctx.runAction(api.spotify.searchTrack, {
          artist,
          title,
        });
        songs.push(songData);
      } catch (error) {
        console.error(
          `Failed to fetch ${artist} - ${title}:`,
          error instanceof Error ? error.message : String(error),
        );
        songs.push({
          spotifyId: `fake${i}`,
          previewURL: "",
          correctArtist: artist,
          correctTitle: title,
          albumArt: "https://via.placeholder.com/300",
        });
      }
    }

    await ctx.runMutation(internal.rounds.insertRounds, {
      gameId,
      songs,
    });
  },
});

export const insertRounds = internalMutation({
  args: {
    gameId: v.id("games"),
    songs: v.array(
      v.object({
        spotifyId: v.string(),
        previewURL: v.string(),
        correctArtist: v.string(),
        correctTitle: v.string(),
        albumArt: v.string(),
        releaseYear: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, { gameId, songs }) => {
    for (let i = 0; i < songs.length; i++) {
      await ctx.db.insert("rounds", {
        gameId,
        roundNumber: i,
        songData: songs[i],
      });
    }
  },
});
