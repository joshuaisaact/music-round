import { v } from "convex/values";
import { internalAction, internalMutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const count = query({
  args: {},
  handler: async (ctx) => {
    const songs = await ctx.db.query("songs").collect();
    return songs.length;
  },
});

export const getRandomSongs = query({
  args: { count: v.number() },
  handler: async (ctx, { count }) => {
    const allSongs = await ctx.db.query("songs").collect();

    if (allSongs.length === 0) {
      throw new Error(
        "No songs in database. Please run the seed function first.",
      );
    }

    const shuffled = [...allSongs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  },
});

export const seedFromPlaylist = internalAction({
  args: {},
  handler: async (ctx): Promise<{ count: number }> => {
    console.log("Fetching tracks from Spotify playlist...");

    const tracks: { artist: string; title: string; spotifyId: string }[] = await ctx.runAction(api.spotify.getPlaylistTracks, {});

    console.log(`Fetched ${tracks.length} tracks from playlist`);

    await ctx.runMutation(internal.songs.replaceSongs, {
      songs: tracks,
    });

    console.log(`Successfully seeded ${tracks.length} songs into database`);

    return { count: tracks.length };
  },
});

export const replaceSongs = internalMutation({
  args: {
    songs: v.array(
      v.object({
        artist: v.string(),
        title: v.string(),
        spotifyId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { songs }) => {
    const existingSongs = await ctx.db.query("songs").collect();
    for (const song of existingSongs) {
      await ctx.db.delete(song._id);
    }

    for (const song of songs) {
      await ctx.db.insert("songs", {
        artist: song.artist,
        title: song.title,
        spotifyId: song.spotifyId,
      });
    }
  },
});
