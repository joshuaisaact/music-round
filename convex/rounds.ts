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
    // Classic disco and house tracks from the 70s/80s
    const testSongs = [
      { artist: "Mr. Fingers", title: "Can You Feel It" },
      { artist: "Mr. Fingers", title: "Mystery of Love" },
      { artist: "Donna Summer", title: "I Feel Love" },
      { artist: "Chic", title: "Good Times" },
      { artist: "Inner City", title: "Good Life" },
      { artist: "Marshall Jefferson", title: "Move Your Body" },
      { artist: "Frankie Knuckles", title: "Your Love" },
      { artist: "Earth, Wind & Fire", title: "September" },
      { artist: "Sister Sledge", title: "We Are Family" },
      { artist: "Sylvester", title: "You Make Me Feel (Mighty Real)" },
      { artist: "Chic", title: "Le Freak" },
      { artist: "Cerrone", title: "Supernature" },
      { artist: "The Trammps", title: "Disco Inferno" },
      { artist: "Gloria Gaynor", title: "I Will Survive" },
      { artist: "KC and the Sunshine Band", title: "Get Down Tonight" },
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
