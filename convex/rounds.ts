import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

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

export const createTestRounds = internalMutation({
  args: { gameId: v.id("games"), count: v.number() },
  handler: async (ctx, { gameId, count }) => {
    const fakeSongs = [
      {
        spotifyId: "fake1",
        previewURL: "https://example.com/preview1.mp3",
        correctArtist: "The Beatles",
        correctTitle: "Hey Jude",
        albumArt: "https://via.placeholder.com/300",
      },
      {
        spotifyId: "fake2",
        previewURL: "https://example.com/preview2.mp3",
        correctArtist: "Queen",
        correctTitle: "Bohemian Rhapsody",
        albumArt: "https://via.placeholder.com/300",
      },
      {
        spotifyId: "fake3",
        previewURL: "https://example.com/preview3.mp3",
        correctArtist: "Nirvana",
        correctTitle: "Smells Like Teen Spirit",
        albumArt: "https://via.placeholder.com/300",
      },
      {
        spotifyId: "fake4",
        previewURL: "https://example.com/preview4.mp3",
        correctArtist: "Led Zeppelin",
        correctTitle: "Stairway to Heaven",
        albumArt: "https://via.placeholder.com/300",
      },
      {
        spotifyId: "fake5",
        previewURL: "https://example.com/preview5.mp3",
        correctArtist: "Pink Floyd",
        correctTitle: "Comfortably Numb",
        albumArt: "https://via.placeholder.com/300",
      },
    ];

    for (let i = 0; i < count; i++) {
      const song = fakeSongs[i % fakeSongs.length];
      await ctx.db.insert("rounds", {
        gameId,
        roundNumber: i,
        songData: song,
      });
    }
  },
});
