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
    // Newer indie/alternative songs more likely to have preview URLs
    const testSongs = [
      { artist: "Tame Impala", title: "The Less I Know The Better" },
      { artist: "Glass Animals", title: "Heat Waves" },
      { artist: "Arctic Monkeys", title: "Do I Wanna Know?" },
      { artist: "The 1975", title: "Somebody Else" },
      { artist: "alt-J", title: "Breezeblocks" },
    ];

    const songs = [];

    // Fetch real Spotify data for each test song
    for (let i = 0; i < count; i++) {
      const { artist, title } = testSongs[i % testSongs.length];

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
        // Fallback to fake data if Spotify fails
        songs.push({
          spotifyId: `fake${i}`,
          previewURL: "",
          correctArtist: artist,
          correctTitle: title,
          albumArt: "https://via.placeholder.com/300",
        });
      }
    }

    // Insert rounds with the fetched song data
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
