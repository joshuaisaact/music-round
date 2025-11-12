import { v } from "convex/values";
import { internalAction, internalMutation, query, action, mutation } from "./_generated/server";
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

// Helper action to manually add a song - searches Spotify and adds to DB
export const addSong = action({
  args: {
    artist: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { artist, title }): Promise<{
    success: boolean;
    artist: string;
    title: string;
    spotifyId: string;
    hasPreview: boolean;
  }> => {
    console.log(`Searching for: ${artist} - ${title}`);

    // Check if song already exists
    const allSongs: Array<{ artist: string; title: string; spotifyId?: string }> = await ctx.runQuery(api.songs.getAll);
    const existing = allSongs.find(
      (s: { artist: string; title: string }) =>
        s.artist.toLowerCase() === artist.toLowerCase() &&
        s.title.toLowerCase() === title.toLowerCase(),
    );

    if (existing) {
      throw new Error(`Song already exists: ${artist} - ${title}`);
    }

    // Search Spotify for the track
    const trackData: {
      spotifyId: string;
      previewURL: string;
      correctArtist: string;
      correctTitle: string;
      albumArt: string;
      releaseYear?: number;
    } = await ctx.runAction(api.spotify.searchTrack, {
      artist,
      title,
    });

    // Add to database
    await ctx.runMutation(internal.songs.insertSong, {
      artist: trackData.correctArtist,
      title: trackData.correctTitle,
      spotifyId: trackData.spotifyId,
    });

    console.log(`Successfully added: ${trackData.correctArtist} - ${trackData.correctTitle}`);

    return {
      success: true,
      artist: trackData.correctArtist,
      title: trackData.correctTitle,
      spotifyId: trackData.spotifyId,
      hasPreview: !!trackData.previewURL,
    };
  },
});

// Internal mutation to insert a single song
export const insertSong = internalMutation({
  args: {
    artist: v.string(),
    title: v.string(),
    spotifyId: v.string(),
  },
  handler: async (ctx, { artist, title, spotifyId }) => {
    return await ctx.db.insert("songs", {
      artist,
      title,
      spotifyId,
    });
  },
});

// Helper query to get all songs
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("songs").collect();
  },
});
