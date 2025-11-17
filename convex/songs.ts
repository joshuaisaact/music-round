import { v } from "convex/values";
import { internalAction, internalMutation, query, action } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const count = query({
  args: {},
  handler: async (ctx) => {
    const songs = await ctx.db.query("songs").collect();
    return songs.length;
  },
});

export const getRandomSongs = query({
  args: {
    count: v.number(),
    playlistTag: v.optional(v.string()),
    seed: v.optional(v.number()),
  },
  handler: async (ctx, { count, playlistTag, seed }) => {
    const allSongs = await ctx.db.query("songs").collect();

    if (allSongs.length === 0) {
      throw new Error(
        "No songs in database. Please run the seed function first.",
      );
    }

    // Filter by playlist tag if provided
    const filteredSongs = playlistTag
      ? allSongs.filter((song) => song.tags?.includes(playlistTag))
      : allSongs;

    if (filteredSongs.length === 0) {
      throw new Error(
        playlistTag
          ? `No songs found with tag "${playlistTag}".`
          : "No songs in database.",
      );
    }

    // Use seed (timestamp) for better randomization
    const randomSeed = seed || Date.now();

    // Shuffle using a seeded random approach
    const shuffled = [...filteredSongs].map((song, index) => ({
      song,
      sort: Math.sin(randomSeed + index) * 10000
    }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ song }) => song);

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

export const replaceSongsWithTags = internalMutation({
  args: {
    songs: v.array(
      v.object({
        artist: v.string(),
        title: v.string(),
        spotifyId: v.string(),
        tags: v.optional(v.array(v.string())),
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
        tags: song.tags,
      });
    }
  },
});

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

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("songs").collect();
  },
});

export const getAvailablePlaylists = query({
  args: {},
  handler: async (ctx) => {
    const allSongs = await ctx.db.query("songs").collect();

    // Aggregate songs by tag
    const tagCounts = new Map<string, number>();

    for (const song of allSongs) {
      const tags = song.tags || [];
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    // Define playlist metadata (display names, sections, etc.)
    const playlistMetadata: Record<string, {
      name: string;
      subtitle?: string;
      section?: string;
      order: number;
      previewSong: { artist: string; title: string };
    }> = {
      "daily-songs": {
        name: "DAILY SONGS",
        order: 0,
        previewSong: { artist: "The Killers", title: "Mr. Brightside" },
      },
      "1980s": {
        name: "80s",
        section: "Decades",
        order: 1,
        previewSong: { artist: "Michael Jackson", title: "Billie Jean" },
      },
      "1990s": {
        name: "90s",
        section: "Decades",
        order: 2,
        previewSong: { artist: "Nirvana", title: "Smells Like Teen Spirit" },
      },
      "2000s": {
        name: "00s",
        section: "Decades",
        order: 3,
        previewSong: { artist: "OutKast", title: "Hey Ya!" },
      },
      "glastonbury-headliners": {
        name: "PYRAMID STAGE HEADLINERS",
        subtitle: "Glastonbury 2010-2025",
        section: "Festivals",
        order: 4,
        previewSong: { artist: "Radiohead", title: "Karma Police" },
      },
      "glastonbury-2025": {
        name: "GLASTONBURY 2025",
        subtitle: "THE MAIN STAGES",
        section: "Festivals",
        order: 5,
        previewSong: { artist: "Olivia Rodrigo", title: "vampire" },
      },
      "glastonbury-2024": {
        name: "GLASTONBURY 2024",
        subtitle: "THE MAIN STAGES",
        section: "Festivals",
        order: 6,
        previewSong: { artist: "Dua Lipa", title: "Houdini" },
      },
      "glastonbury-2023": {
        name: "GLASTONBURY 2023",
        subtitle: "THE MAIN STAGES",
        section: "Festivals",
        order: 7,
        previewSong: { artist: "Elton John", title: "Rocket Man" },
      },
      "buttrock": {
        name: "BUTTROCK",
        section: "Genre",
        order: 6,
        previewSong: { artist: "Creed", title: "My Sacrifice" },
      },
      "emo": {
        name: "EMO",
        section: "Genre",
        order: 6,
        previewSong: { artist: "blink-182", title: "I Miss You" },
      },
      "landfill-indie": {
        name: "LANDFILL INDIE",
        section: "Genre",
        order: 7,
        previewSong: { artist: "The Fratellis", title: "Chelsea Dagger" },
      },
      "new-romantics": {
        name: "NEW ROMANTICS",
        section: "Genre",
        order: 8,
        previewSong: { artist: "ABC", title: "Poison Arrow" },
      },
      "rnb-classics": {
        name: "R&B CLASSICS",
        section: "Genre",
        order: 9,
        previewSong: { artist: "Blackstreet", title: "No Diggity" },
      },
    };

    // Build result array
    const playlists = Array.from(tagCounts.entries()).map(([tag, count]) => ({
      tag,
      name: playlistMetadata[tag]?.name || tag,
      subtitle: playlistMetadata[tag]?.subtitle,
      section: playlistMetadata[tag]?.section,
      songCount: count,
      order: playlistMetadata[tag]?.order ?? 999,
      previewSong: playlistMetadata[tag]?.previewSong,
    }));

    // Sort by order
    return playlists.sort((a, b) => a.order - b.order);
  },
});

export const tagExistingSongs = internalMutation({
  args: {
    tag: v.string(),
  },
  handler: async (ctx, { tag }) => {
    const allSongs = await ctx.db.query("songs").collect();

    let updatedCount = 0;
    for (const song of allSongs) {
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

export const tagUntaggedSongs = internalMutation({
  args: {
    tag: v.string(),
  },
  handler: async (ctx, { tag }) => {
    const allSongs = await ctx.db.query("songs").collect();

    let updatedCount = 0;
    for (const song of allSongs) {
      const currentTags = song.tags || [];
      if (currentTags.length === 0) {
        await ctx.db.patch(song._id, {
          tags: [tag],
        });
        updatedCount++;
      }
    }

    console.log(`Tagged ${updatedCount} untagged songs with "${tag}"`);
    return { updatedCount, totalSongs: allSongs.length };
  },
});

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

export const removeTag = internalMutation({
  args: {
    tag: v.string(),
  },
  handler: async (ctx, { tag }) => {
    const allSongs = await ctx.db.query("songs").collect();

    let removed = 0;
    let deleted = 0;

    for (const song of allSongs) {
      const currentTags = song.tags || [];

      if (currentTags.includes(tag)) {
        const newTags = currentTags.filter((t) => t !== tag);

        if (newTags.length === 0) {
          // Delete songs that only have this tag
          await ctx.db.delete(song._id);
          deleted++;
        } else {
          // Just remove the tag
          await ctx.db.patch(song._id, {
            tags: newTags,
          });
          removed++;
        }
      }
    }

    console.log(`Removed "${tag}" from ${removed} songs, deleted ${deleted} songs`);
    return { removed, deleted, totalSongs: allSongs.length };
  },
});
