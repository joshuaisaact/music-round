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

// Simple hash function to convert string to number
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export const createTestRounds = internalAction({
  args: {
    gameId: v.id("games"),
    count: v.number(),
    playlistTag: v.optional(v.string()),
    dailySeed: v.optional(v.string()), // For daily mode to ensure same songs for everyone
    startingRoundNumber: v.optional(v.number()), // For battle royale on-demand generation
  },
  handler: async (ctx, { gameId, count, playlistTag, dailySeed, startingRoundNumber }) => {
    const songs = [];
    const maxAttempts = count * 3; // Try up to 3x the needed count to find songs with previews
    let attempts = 0;

    while (songs.length < count && attempts < maxAttempts) {
      // Fetch more songs than we need to account for ones without previews
      const batchSize: number = count - songs.length + 5;

      // Use daily seed if provided (for daily mode), otherwise use timestamp
      // Convert string seed to number using hash function
      const seed = dailySeed
        ? hashString(`${dailySeed}-${attempts}`)
        : Date.now() + attempts;

      const randomSongs: Array<{ artist: string; title: string }> = await ctx.runQuery(api.songs.getRandomSongs, {
        count: batchSize,
        playlistTag,
        seed,
      });

      for (const { artist, title } of randomSongs) {
        if (songs.length >= count) break;

        try {
          const songData: {
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

          // Only add songs that have a preview URL
          if (songData.previewURL && songData.previewURL.trim() !== "") {
            songs.push(songData);
          } else {
            console.log(`Skipping ${artist} - ${title}: No preview URL`);
          }
        } catch (error) {
          console.error(
            `Failed to fetch ${artist} - ${title}:`,
            error instanceof Error ? error.message : String(error),
          );
        }

        attempts++;
      }
    }

    if (songs.length < count) {
      throw new Error(
        `Could only find ${songs.length} songs with preview URLs out of ${count} requested`,
      );
    }

    await ctx.runMutation(internal.rounds.insertRounds, {
      gameId,
      songs: songs.slice(0, count),
      startingRoundNumber: startingRoundNumber ?? 0,
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
    startingRoundNumber: v.number(),
  },
  handler: async (ctx, { gameId, songs, startingRoundNumber }) => {
    for (let i = 0; i < songs.length; i++) {
      await ctx.db.insert("rounds", {
        gameId,
        roundNumber: startingRoundNumber + i,
        songData: songs[i],
      });
    }
  },
});
