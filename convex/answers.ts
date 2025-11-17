import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD") // Decompose accented characters (é -> e + ́)
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks (accents)
    .trim()
    .replace(/[^\w\s&\-/]/g, "") // Remove punctuation early (keep &, -, / for now)
    .replace(/\s*&\s*/g, " and ") // Convert & to "and" (with spaces normalized)
    .replace(/\s*-\s*.*?(remastered|remix|re-?master|deluxe|edition|version|live|acoustic).*$/i, "") // Remove remaster/remix/edition suffixes (with optional year/text before keyword)
    .replace(/^the\s+/i, "") // Remove leading "the"
    .replace(/[-/]/g, " ") // Convert hyphens and slashes to spaces
    .replace(/[^\w\s]/g, "") // Remove any remaining punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

function calculateScore(
  submittedArtist: string,
  correctArtist: string,
  submittedTitle: string,
  correctTitle: string,
): { points: number; artistCorrect: boolean; titleCorrect: boolean } {
  const artistMatch = normalize(submittedArtist) === normalize(correctArtist);
  const titleMatch = normalize(submittedTitle) === normalize(correctTitle);

  return { points: 0, artistCorrect: artistMatch, titleCorrect: titleMatch };
}

function calculateComponentPoints(
  secondsElapsed: number,
  totalSeconds: number,
): number {
  const maxPoints = 500;
  const minPoints = 250;
  const gracePercent = 0.1;

  const graceTime = totalSeconds * gracePercent;

  if (secondsElapsed <= graceTime) {
    return maxPoints;
  }

  const adjustedElapsed = secondsElapsed - graceTime;
  const adjustedTotal = totalSeconds * (1 - gracePercent);
  const pointsAvailable = maxPoints - ((maxPoints - minPoints) / adjustedTotal) * adjustedElapsed;

  return Math.ceil(pointsAvailable);
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

export const useHint = mutation({
  args: {
    roundId: v.id("rounds"),
    playerId: v.id("players"),
  },
  handler: async (ctx, { roundId, playerId }) => {
    const round = await ctx.db.get(roundId);
    if (!round) throw new Error("Round not found");

    // Only allow hints during active phase
    if (round.phase !== "active") {
      throw new Error("Can only use hints during the active phase");
    }

    const game = await ctx.db.get(round.gameId);
    if (!game) throw new Error("Game not found");

    const hintsPerPlayer = game.settings.hintsPerPlayer ?? 3;

    // Get player to check total hints used across all rounds
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    const totalHintsUsed = player.hintsUsed ?? 0;

    // Check if player has hints remaining for the entire game
    if (totalHintsUsed >= hintsPerPlayer) {
      throw new Error("No hints remaining");
    }

    // Get or create answer record for this round
    let answer = await ctx.db
      .query("answers")
      .withIndex("by_round", (q) => q.eq("roundId", roundId))
      .filter((q) => q.eq(q.field("playerId"), playerId))
      .first();

    // Check if already fully correct
    if (answer && answer.artistCorrect && answer.titleCorrect) {
      throw new Error("Answer already complete");
    }

    // Generate random letter positions for artist and title
    // Normalize to match what players need to type
    const correctArtist = normalize(round.songData.correctArtist);
    const correctTitle = normalize(round.songData.correctTitle);

    const getRandomLetters = (
      text: string,
      count: number,
      existingLetters: { index: number; letter: string }[] = []
    ) => {
      const letters: { index: number; letter: string }[] = [...existingLetters];
      const validIndices: number[] = [];
      const alreadyRevealedIndices = new Set(existingLetters.map(l => l.index));

      // Find all valid letter indices (not spaces or punctuation) that aren't already revealed
      for (let i = 0; i < text.length; i++) {
        if (text[i].match(/[a-zA-Z0-9]/) && !alreadyRevealedIndices.has(i)) {
          validIndices.push(i);
        }
      }

      // Pick random indices
      const shuffled = [...validIndices].sort(() => Math.random() - 0.5);
      const selectedIndices = shuffled.slice(0, Math.min(count, validIndices.length));

      for (const index of selectedIndices) {
        letters.push({ index, letter: text[index] });
      }

      return letters;
    };

    // Get existing revealed letters or start fresh
    const existingArtistLetters = answer?.revealedArtistLetters || [];
    const existingTitleLetters = answer?.revealedTitleLetters || [];

    // Add 2 MORE letters to existing ones
    const revealedArtistLetters = getRandomLetters(correctArtist, 2, existingArtistLetters);
    const revealedTitleLetters = getRandomLetters(correctTitle, 2, existingTitleLetters);

    const now = Date.now();

    if (answer) {
      // Update existing answer with revealed letters
      const currentRoundHints = answer.hintsUsed ?? 0;
      await ctx.db.patch(answer._id, {
        hintsUsed: currentRoundHints + 1,
        hintUsedAt: now,
        revealedArtistLetters,
        revealedTitleLetters,
      });
    } else {
      // Create new answer record with hint usage
      await ctx.db.insert("answers", {
        roundId,
        playerId,
        gameId: round.gameId,
        artist: "",
        title: "",
        submittedAt: now,
        points: 0,
        artistCorrect: false,
        titleCorrect: false,
        attempts: 0,
        hintsUsed: 1,
        hintUsedAt: now,
        revealedArtistLetters,
        revealedTitleLetters,
      });
    }

    // Increment player's total hints used and apply -100 point penalty
    // Don't penalize eliminated players
    await ctx.db.patch(playerId, {
      hintsUsed: totalHintsUsed + 1,
      score: player.eliminated ? player.score : Math.max(0, player.score - 100), // Don't go below 0 or penalize eliminated
    });

    return {
      revealedArtistLetters,
      revealedTitleLetters,
      hintsRemaining: hintsPerPlayer - (totalHintsUsed + 1),
    };
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

    if (!round.activeAt) {
      throw new Error("Round has not started yet");
    }

    const game = await ctx.db.get(round.gameId);
    if (!game) throw new Error("Game not found");

    const existingAnswer = await ctx.db
      .query("answers")
      .withIndex("by_round", (q) => q.eq("roundId", roundId))
      .filter((q) => q.eq(q.field("playerId"), playerId))
      .first();

    const { artistCorrect, titleCorrect } = calculateScore(
      artist,
      round.songData.correctArtist,
      title,
      round.songData.correctTitle,
    );

    // Calculate elapsed time from when round became active
    const now = Date.now();
    const secondsElapsed = Math.floor((now - round.activeAt) / 1000);
    const totalSeconds = game.settings.secondsPerRound;

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

      // Calculate timestamps for newly locked components
      const artistLockedAt = finalArtistCorrect && !existingAnswer.artistCorrect ? now : existingAnswer.artistLockedAt;
      const titleLockedAt = finalTitleCorrect && !existingAnswer.titleCorrect ? now : existingAnswer.titleLockedAt;

      // Calculate points for each locked component based on when it was locked
      let artistPoints = 0;
      let titlePoints = 0;

      if (artistLockedAt) {
        const artistSecondsElapsed = Math.floor((artistLockedAt - round.activeAt) / 1000);
        artistPoints = calculateComponentPoints(artistSecondsElapsed, totalSeconds);
      }

      if (titleLockedAt) {
        const titleSecondsElapsed = Math.floor((titleLockedAt - round.activeAt) / 1000);
        titlePoints = calculateComponentPoints(titleSecondsElapsed, totalSeconds);
      }

      const totalPoints = artistPoints + titlePoints;

      await ctx.db.patch(existingAnswer._id, {
        artist: finalArtist,
        title: finalTitle,
        artistCorrect: finalArtistCorrect,
        titleCorrect: finalTitleCorrect,
        points: totalPoints,
        attempts: newAttempts,
        lockedAt: finalArtistCorrect && finalTitleCorrect ? now : undefined,
        artistLockedAt,
        titleLockedAt,
      });

      // Award points incrementally for newly correct parts
      let pointsToAward = 0;
      if (artistCorrect && !existingAnswer.artistCorrect) {
        pointsToAward += artistPoints;
      }
      if (titleCorrect && !existingAnswer.titleCorrect) {
        pointsToAward += titlePoints;
      }

      if (pointsToAward > 0) {
        const player = await ctx.db.get(playerId);
        // Don't award points to eliminated players
        if (player && !player.eliminated) {
          await ctx.db.patch(playerId, {
            score: player.score + pointsToAward,
          });
        }
      }

      return {
        answerId: existingAnswer._id,
        points: totalPoints,
        artistCorrect: finalArtistCorrect,
        titleCorrect: finalTitleCorrect,
        attempts: newAttempts,
        isLocked: finalArtistCorrect && finalTitleCorrect,
      };
    }

    // First submission - create new answer
    const artistPoints = artistCorrect ? calculateComponentPoints(secondsElapsed, totalSeconds) : 0;
    const titlePoints = titleCorrect ? calculateComponentPoints(secondsElapsed, totalSeconds) : 0;
    const totalPoints = artistPoints + titlePoints;

    const answerId = await ctx.db.insert("answers", {
      roundId,
      playerId,
      gameId: round.gameId,
      artist,
      title,
      submittedAt: now,
      points: totalPoints,
      artistCorrect,
      titleCorrect,
      attempts: 1,
      lockedAt: isFullyCorrect ? now : undefined,
      artistLockedAt: artistCorrect ? now : undefined,
      titleLockedAt: titleCorrect ? now : undefined,
    });

    // Award points for any correct parts on first submission
    if (totalPoints > 0) {
      const player = await ctx.db.get(playerId);
      // Don't award points to eliminated players
      if (player && !player.eliminated) {
        await ctx.db.patch(playerId, {
          score: player.score + totalPoints,
        });
      }
    }

    return {
      answerId,
      points: totalPoints,
      artistCorrect,
      titleCorrect,
      attempts: 1,
      isLocked: isFullyCorrect,
    };
  },
});
