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
      .replace(/\s*&\s*/g, " and ") // Convert & to "and" (with spaces normalized)
      .replace(/\s*-\s*.*?(remastered|remix|re-?master|deluxe|edition|version|live|acoustic).*$/i, "") // Remove remaster/remix/edition suffixes (with optional year/text before keyword)
      .replace(/^the\s+/i, "") // Remove leading "the"
      .replace(/[-\/]/g, " ") // Convert hyphens and slashes to spaces
      .replace(/[^\w\s]/g, "") // Remove punctuation and special characters
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

  const artistMatch = normalize(submittedArtist) === normalize(correctArtist);
  const titleMatch = normalize(submittedTitle) === normalize(correctTitle);

  let points = 0;
  if (artistMatch) points += 50;
  if (titleMatch) points += 50;

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

export const listForPlayer = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    return await ctx.db
      .query("answers")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
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

    const existingAnswer = await ctx.db
      .query("answers")
      .withIndex("by_round", (q) => q.eq("roundId", roundId))
      .filter((q) => q.eq(q.field("playerId"), playerId))
      .first();

    const { points, artistCorrect, titleCorrect } = calculateScore(
      artist,
      round.songData.correctArtist,
      title,
      round.songData.correctTitle,
    );

    // Check if answer is now fully correct (both parts right)
    const isFullyCorrect = artistCorrect && titleCorrect;

    if (existingAnswer) {
      // If already locked (was fully correct), don't allow changes
      if (existingAnswer.lockedAt) {
        throw new Error("Answer is locked");
      }

      // Update the answer, incrementing attempts (default to 1 for old data)
      const newAttempts = (existingAnswer.attempts || 1) + 1;

      // Keep the correct parts from previous attempts
      const finalArtist = existingAnswer.artistCorrect ? existingAnswer.artist : artist;
      const finalTitle = existingAnswer.titleCorrect ? existingAnswer.title : title;
      const finalArtistCorrect = existingAnswer.artistCorrect || artistCorrect;
      const finalTitleCorrect = existingAnswer.titleCorrect || titleCorrect;

      // Recalculate points with final correct values
      const finalScore = calculateScore(
        finalArtist,
        round.songData.correctArtist,
        finalTitle,
        round.songData.correctTitle,
      );

      await ctx.db.patch(existingAnswer._id, {
        artist: finalArtist,
        title: finalTitle,
        artistCorrect: finalArtistCorrect,
        titleCorrect: finalTitleCorrect,
        points: finalScore.points,
        attempts: newAttempts,
        lockedAt: finalArtistCorrect && finalTitleCorrect ? Date.now() : undefined,
      });

      // Award points incrementally for newly correct parts
      let pointsToAward = 0;
      if (artistCorrect && !existingAnswer.artistCorrect) pointsToAward += 50;
      if (titleCorrect && !existingAnswer.titleCorrect) pointsToAward += 50;

      if (pointsToAward > 0) {
        const player = await ctx.db.get(playerId);
        if (player) {
          await ctx.db.patch(playerId, {
            score: player.score + pointsToAward,
          });
        }
      }

      return {
        answerId: existingAnswer._id,
        points: finalScore.points,
        artistCorrect: finalArtistCorrect,
        titleCorrect: finalTitleCorrect,
        attempts: newAttempts,
        isLocked: finalArtistCorrect && finalTitleCorrect,
      };
    }

    // First submission - create new answer
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
      attempts: 1,
      lockedAt: isFullyCorrect ? Date.now() : undefined,
    });

    // Award points for any correct parts on first submission
    if (points > 0) {
      const player = await ctx.db.get(playerId);
      if (player) {
        await ctx.db.patch(playerId, {
          score: player.score + points,
        });
      }
    }

    return {
      answerId,
      points,
      artistCorrect,
      titleCorrect,
      attempts: 1,
      isLocked: isFullyCorrect,
    };
  },
});
