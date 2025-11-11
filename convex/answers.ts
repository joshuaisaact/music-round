import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function calculateScore(
  submittedArtist: string,
  correctArtist: string,
  submittedTitle: string,
  correctTitle: string,
): { points: number; artistCorrect: boolean; titleCorrect: boolean } {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/^the\s+/i, "") // Remove leading "the"
      .replace(/[^\w\s]/g, "") // Remove punctuation and special characters
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

  const artistMatch = normalize(submittedArtist) === normalize(correctArtist);
  const titleMatch = normalize(submittedTitle) === normalize(correctTitle);

  let points = 0;
  if (artistMatch && titleMatch) points = 100;
  else if (artistMatch) points = 50;
  else if (titleMatch) points = 40;

  return { points, artistCorrect: artistMatch, titleCorrect: titleMatch };
}

export const listForRound = query({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, { roundId }) => {
    return await ctx.db
      .query("answers")
      .withIndex("by_round", (q) => q.eq("roundId", roundId))
      .collect();
  },
});

export const submit = mutation({
  args: {
    roundId: v.id("rounds"),
    playerId: v.id("players"),
    artist: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { roundId, playerId, artist, title }) => {
    const round = await ctx.db.get(roundId);
    if (!round) throw new Error("Round not found");

    // Only allow submissions during active phase
    if (round.phase !== "active") {
      throw new Error("Can only submit answers during the active phase");
    }

    const existing = await ctx.db
      .query("answers")
      .withIndex("by_round", (q) => q.eq("roundId", roundId))
      .collect();

    if (existing.find((a) => a.playerId === playerId)) {
      throw new Error("Already answered this round");
    }

    const { points, artistCorrect, titleCorrect } = calculateScore(
      artist,
      round.songData.correctArtist,
      title,
      round.songData.correctTitle,
    );

    const answerId = await ctx.db.insert("answers", {
      roundId,
      playerId,
      gameId: round.gameId,
      artist,
      title,
      submittedAt: Date.now(),
      points,
      artistCorrect,
      titleCorrect,
    });

    const player = await ctx.db.get(playerId);
    if (player) {
      await ctx.db.patch(playerId, {
        score: player.score + points,
      });
    }

    return { answerId, points, artistCorrect, titleCorrect };
  },
});
