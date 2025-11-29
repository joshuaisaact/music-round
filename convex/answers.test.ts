import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

describe("answers", () => {
  async function setupGame(t: ReturnType<typeof convexTest>, overrides?: { phase?: "preparing" | "active" | "ended" }) {
    const gameId = await t.run(async (ctx) => {
      return await ctx.db.insert("games", {
        code: "TEST01",
        hostId: "host-session",
        status: "playing",
        currentRound: 1,
        createdAt: Date.now(),
        settings: {
          roundCount: 5,
          secondsPerRound: 30,
          hintsPerPlayer: 2,
        },
      });
    });

    const roundId = await t.run(async (ctx) => {
      return await ctx.db.insert("rounds", {
        gameId,
        roundNumber: 1,
        songData: {
          spotifyId: "abc123",
          previewURL: "https://example.com/preview.mp3",
          correctArtist: "The Beatles",
          correctTitle: "Hey Jude",
          albumArt: "https://example.com/art.jpg",
        },
        phase: overrides?.phase ?? "active",
        activeAt: Date.now() - 5000, // 5 seconds ago
      });
    });

    const playerId = await t.run(async (ctx) => {
      return await ctx.db.insert("players", {
        gameId,
        sessionId: "player-1",
        name: "Test Player",
        score: 0,
        isHost: false,
        joinedAt: Date.now(),
      });
    });

    return { gameId, roundId, playerId };
  }

  describe("submit", () => {
    it("awards points for correct answer", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t);

      const result = await t.mutation(api.answers.submit, {
        roundId,
        playerId,
        artist: "The Beatles",
        title: "Hey Jude",
      });

      expect(result.artistCorrect).toBe(true);
      expect(result.titleCorrect).toBe(true);
      expect(result.points).toBeGreaterThan(0);
      expect(result.isLocked).toBe(true);
    });

    it("normalizes answers for comparison", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t);

      // Lowercase, missing "The", extra spaces
      const result = await t.mutation(api.answers.submit, {
        roundId,
        playerId,
        artist: "beatles",
        title: "  hey jude  ",
      });

      expect(result.artistCorrect).toBe(true);
      expect(result.titleCorrect).toBe(true);
    });

    it("gives zero points for wrong answer", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t);

      const result = await t.mutation(api.answers.submit, {
        roundId,
        playerId,
        artist: "Rolling Stones",
        title: "Satisfaction",
      });

      expect(result.artistCorrect).toBe(false);
      expect(result.titleCorrect).toBe(false);
      expect(result.points).toBe(0);
    });

    it("gives partial points for artist only", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t);

      const result = await t.mutation(api.answers.submit, {
        roundId,
        playerId,
        artist: "The Beatles",
        title: "Wrong Song",
      });

      expect(result.artistCorrect).toBe(true);
      expect(result.titleCorrect).toBe(false);
      expect(result.points).toBeGreaterThan(0);
      expect(result.isLocked).toBe(false);
    });

    it("gives partial points for title only", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t);

      const result = await t.mutation(api.answers.submit, {
        roundId,
        playerId,
        artist: "Wrong Artist",
        title: "Hey Jude",
      });

      expect(result.artistCorrect).toBe(false);
      expect(result.titleCorrect).toBe(true);
      expect(result.points).toBeGreaterThan(0);
    });

    it("keeps previously correct answers when resubmitting", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t);

      // First attempt: get artist right
      await t.mutation(api.answers.submit, {
        roundId,
        playerId,
        artist: "The Beatles",
        title: "Wrong",
      });

      // Second attempt: get title right (but wrong artist this time)
      const result = await t.mutation(api.answers.submit, {
        roundId,
        playerId,
        artist: "Oops Wrong",
        title: "Hey Jude",
      });

      // Should keep the correct artist from first attempt
      expect(result.artistCorrect).toBe(true);
      expect(result.titleCorrect).toBe(true);
      expect(result.isLocked).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it("rejects submission when answer is locked", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t);

      // Lock the answer by getting both right
      await t.mutation(api.answers.submit, {
        roundId,
        playerId,
        artist: "The Beatles",
        title: "Hey Jude",
      });

      // Try to submit again
      await expect(
        t.mutation(api.answers.submit, {
          roundId,
          playerId,
          artist: "Different",
          title: "Answer",
        })
      ).rejects.toThrow("Answer is locked");
    });

    it("rejects submission when round is not active", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t, { phase: "preparing" });

      await expect(
        t.mutation(api.answers.submit, {
          roundId,
          playerId,
          artist: "The Beatles",
          title: "Hey Jude",
        })
      ).rejects.toThrow("Can only submit answers during the active phase");
    });

    it("updates player score when correct", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t);

      await t.mutation(api.answers.submit, {
        roundId,
        playerId,
        artist: "The Beatles",
        title: "Hey Jude",
      });

      const player = await t.run(async (ctx) => ctx.db.get(playerId));
      expect(player?.score).toBeGreaterThan(0);
    });

    it("does not award points to eliminated players", async () => {
      const t = convexTest(schema);
      const { gameId, roundId } = await setupGame(t);

      // Create eliminated player
      const eliminatedPlayerId = await t.run(async (ctx) => {
        return await ctx.db.insert("players", {
          gameId,
          sessionId: "eliminated-1",
          name: "Eliminated Player",
          score: 100,
          isHost: false,
          joinedAt: Date.now(),
          eliminated: true,
          lives: 0,
        });
      });

      await t.mutation(api.answers.submit, {
        roundId,
        playerId: eliminatedPlayerId,
        artist: "The Beatles",
        title: "Hey Jude",
      });

      const player = await t.run(async (ctx) => ctx.db.get(eliminatedPlayerId));
      expect(player?.score).toBe(100); // Unchanged
    });
  });

  describe("useHint", () => {
    it("reveals letters and deducts points", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t);

      // Give player some points first
      await t.run(async (ctx) => {
        await ctx.db.patch(playerId, { score: 500 });
      });

      const result = await t.mutation(api.answers.useHint, {
        roundId,
        playerId,
      });

      expect(result.revealedArtistLetters.length).toBe(2);
      expect(result.revealedTitleLetters.length).toBe(2);
      expect(result.hintsRemaining).toBe(1);

      const player = await t.run(async (ctx) => ctx.db.get(playerId));
      expect(player?.score).toBe(400); // -100 penalty
    });

    it("accumulates revealed letters across hints", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t);

      await t.run(async (ctx) => {
        await ctx.db.patch(playerId, { score: 500 });
      });

      // First hint
      const result1 = await t.mutation(api.answers.useHint, {
        roundId,
        playerId,
      });

      // Second hint
      const result2 = await t.mutation(api.answers.useHint, {
        roundId,
        playerId,
      });

      // Should have 4 letters now (2 + 2)
      expect(result2.revealedArtistLetters.length).toBe(4);
      expect(result2.revealedTitleLetters.length).toBe(4);
      expect(result2.hintsRemaining).toBe(0);
    });

    it("rejects when no hints remaining", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t);

      await t.run(async (ctx) => {
        await ctx.db.patch(playerId, { score: 500, hintsUsed: 2 });
      });

      await expect(
        t.mutation(api.answers.useHint, { roundId, playerId })
      ).rejects.toThrow("No hints remaining");
    });

    it("rejects when round is not active", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t, { phase: "ended" });

      await expect(
        t.mutation(api.answers.useHint, { roundId, playerId })
      ).rejects.toThrow("Can only use hints during the active phase");
    });

    it("does not penalize eliminated players", async () => {
      const t = convexTest(schema);
      const { gameId, roundId } = await setupGame(t);

      const eliminatedPlayerId = await t.run(async (ctx) => {
        return await ctx.db.insert("players", {
          gameId,
          sessionId: "eliminated-1",
          name: "Eliminated Player",
          score: 500,
          isHost: false,
          joinedAt: Date.now(),
          eliminated: true,
          lives: 0,
        });
      });

      await t.mutation(api.answers.useHint, {
        roundId,
        playerId: eliminatedPlayerId,
      });

      const player = await t.run(async (ctx) => ctx.db.get(eliminatedPlayerId));
      expect(player?.score).toBe(500); // Unchanged
    });

    it("does not go below zero points", async () => {
      const t = convexTest(schema);
      const { roundId, playerId } = await setupGame(t);

      // Player has only 50 points
      await t.run(async (ctx) => {
        await ctx.db.patch(playerId, { score: 50 });
      });

      await t.mutation(api.answers.useHint, { roundId, playerId });

      const player = await t.run(async (ctx) => ctx.db.get(playerId));
      expect(player?.score).toBe(0); // Clamped to 0, not -50
    });
  });
});
