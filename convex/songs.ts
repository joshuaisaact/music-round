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

// Import playlist with tags (appends, doesn't replace)
export const importPlaylistWithTags = internalAction({
  args: {
    playlistId: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, { playlistId, tags }): Promise<{ added: number; updated: number; skipped: number; total: number }> => {
    console.log(`Fetching tracks from Spotify playlist ${playlistId}...`);

    const tracks: { artist: string; title: string; spotifyId: string }[] = await ctx.runAction(api.spotify.getPlaylistTracks, {
      playlistId,
    });

    console.log(`Fetched ${tracks.length} tracks from playlist`);

    const result = await ctx.runMutation(internal.songs.appendSongsWithTags, {
      songs: tracks,
      tags,
    });

    console.log(`Import complete: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped`);

    return result;
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

// Migration: Tag all existing songs with "daily-songs"
export const tagExistingSongs = internalMutation({
  args: {
    tag: v.string(),
  },
  handler: async (ctx, { tag }) => {
    const allSongs = await ctx.db.query("songs").collect();

    let updatedCount = 0;
    for (const song of allSongs) {
      // Only update if tags don't exist or don't already contain this tag
      const currentTags = song.tags || [];
      if (!currentTags.includes(tag)) {
        await ctx.db.patch(song._id, {
          tags: [...currentTags, tag],
        });
        updatedCount++;
      }
    }

    console.log(`Tagged ${updatedCount} songs with "${tag}"`);
    return { updatedCount, totalSongs: allSongs.length };
  },
});

// Append songs with tags (handles duplicates by spotifyId)
export const appendSongsWithTags = internalMutation({
  args: {
    songs: v.array(
      v.object({
        artist: v.string(),
        title: v.string(),
        spotifyId: v.string(),
      }),
    ),
    tags: v.array(v.string()),
  },
  handler: async (ctx, { songs, tags }) => {
    const allExistingSongs = await ctx.db.query("songs").collect();
    const existingSongsBySpotifyId = new Map(
      allExistingSongs
        .filter((s) => s.spotifyId)
        .map((s) => [s.spotifyId, s])
    );

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const song of songs) {
      const existing = existingSongsBySpotifyId.get(song.spotifyId);

      if (existing) {
        // Song exists - check if we need to add new tags
        const currentTags = existing.tags || [];
        const newTags = tags.filter((tag) => !currentTags.includes(tag));

        if (newTags.length > 0) {
          await ctx.db.patch(existing._id, {
            tags: [...currentTags, ...newTags],
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        // New song - insert with tags
        await ctx.db.insert("songs", {
          artist: song.artist,
          title: song.title,
          spotifyId: song.spotifyId,
          tags,
        });
        added++;
      }
    }

    return { added, updated, skipped, total: songs.length };
  },
});
