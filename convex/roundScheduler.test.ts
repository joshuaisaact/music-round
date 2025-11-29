import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

describe("roundScheduler", () => {
  describe("transitionToActive", () => {
    it("transitions round from preparing to active", async () => {
      const t = convexTest(schema);

      // Set up game and round directly
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
          },
        });
      });

      // Create a round in preparing phase
      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("rounds", {
          gameId,
          roundNumber: 1,
          songData: {
            spotifyId: "abc123",
            previewURL: "https://example.com/preview.mp3",
            correctArtist: "Test Artist",
            correctTitle: "Test Song",
            albumArt: "https://example.com/art.jpg",
          },
          phase: "preparing",
          startedAt: Date.now(),
        });
      });

      // Transition to active
      await t.mutation(internal.roundScheduler.transitionToActive, { roundId });

      // Verify phase changed
      const round = await t.run(async (ctx) => ctx.db.get(roundId));
      expect(round?.phase).toBe("active");
      expect(round?.activeAt).toBeDefined();
    });

    it("does nothing if round is not in preparing phase", async () => {
      const t = convexTest(schema);

      const gameId = await t.run(async (ctx) => {
        return await ctx.db.insert("games", {
          code: "TEST02",
          hostId: "host-session",
          status: "playing",
          currentRound: 1,
          createdAt: Date.now(),
          settings: {
            roundCount: 5,
            secondsPerRound: 30,
          },
        });
      });

      // Create a round already in active phase
      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("rounds", {
          gameId,
          roundNumber: 1,
          songData: {
            spotifyId: "abc123",
            previewURL: "https://example.com/preview.mp3",
            correctArtist: "Test Artist",
            correctTitle: "Test Song",
            albumArt: "https://example.com/art.jpg",
          },
          phase: "active",
          activeAt: Date.now(),
        });
      });

      await t.mutation(internal.roundScheduler.transitionToActive, { roundId });

      // Phase should still be active (not double-transitioned)
      const round = await t.run(async (ctx) => ctx.db.get(roundId));
      expect(round?.phase).toBe("active");
    });
  });

  describe("battle royale elimination", () => {
    async function setupBattleRoyaleGame(t: ReturnType<typeof convexTest>) {
      // Create game with battle royale settings
      const gameId = await t.run(async (ctx) => {
        return await ctx.db.insert("games", {
          code: "BR0001",
          hostId: "host-session",
          status: "playing",
          currentRound: 1,
          createdAt: Date.now(),
          settings: {
            roundCount: 50,
            secondsPerRound: 30,
            gameMode: "battle_royale",
            hintsPerPlayer: 0,
            isSinglePlayer: false,
          },
        });
      });

      // Create round
      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("rounds", {
          gameId,
          roundNumber: 1,
          songData: {
            spotifyId: "abc123",
            previewURL: "https://example.com/preview.mp3",
            correctArtist: "Test Artist",
            correctTitle: "Test Song",
            albumArt: "https://example.com/art.jpg",
          },
          phase: "active",
          activeAt: Date.now() - 10000,
        });
      });

      return { gameId, roundId };
    }

    it("eliminates player immediately when both answers wrong", async () => {
      const t = convexTest(schema);
      const { gameId, roundId } = await setupBattleRoyaleGame(t);

      // Add player with 3 lives
      const playerId = await t.run(async (ctx) => {
        return await ctx.db.insert("players", {
          gameId,
          sessionId: "player-1",
          name: "Player 1",
          score: 0,
          isHost: false,
          joinedAt: Date.now(),
          lives: 3,
          eliminated: false,
        });
      });

      // Submit wrong answer for both artist and title
      await t.run(async (ctx) => {
        await ctx.db.insert("answers", {
          roundId,
          playerId,
          gameId,
          artist: "Wrong Artist",
          title: "Wrong Song",
          submittedAt: Date.now(),
          artistCorrect: false,
          titleCorrect: false,
          points: 0,
        });
      });

      // End the round
      await t.mutation(internal.roundScheduler.transitionToEnded, { roundId });

      // Player should be eliminated with 0 lives
      const player = await t.run(async (ctx) => ctx.db.get(playerId));
      expect(player?.eliminated).toBe(true);
      expect(player?.lives).toBe(0);
      expect(player?.eliminatedAtRound).toBe(1);
    });

    it("removes one life when one answer is wrong", async () => {
      const t = convexTest(schema);
      const { gameId, roundId } = await setupBattleRoyaleGame(t);

      const playerId = await t.run(async (ctx) => {
        return await ctx.db.insert("players", {
          gameId,
          sessionId: "player-1",
          name: "Player 1",
          score: 0,
          isHost: false,
          joinedAt: Date.now(),
          lives: 3,
          eliminated: false,
        });
      });

      // Got artist right, title wrong
      await t.run(async (ctx) => {
        await ctx.db.insert("answers", {
          roundId,
          playerId,
          gameId,
          artist: "Test Artist",
          title: "Wrong Song",
          submittedAt: Date.now(),
          artistCorrect: true,
          titleCorrect: false,
          points: 50,
        });
      });

      await t.mutation(internal.roundScheduler.transitionToEnded, { roundId });

      const player = await t.run(async (ctx) => ctx.db.get(playerId));
      expect(player?.eliminated).toBe(false);
      expect(player?.lives).toBe(2);
    });

    it("keeps all lives when both answers correct", async () => {
      const t = convexTest(schema);
      const { gameId, roundId } = await setupBattleRoyaleGame(t);

      const playerId = await t.run(async (ctx) => {
        return await ctx.db.insert("players", {
          gameId,
          sessionId: "player-1",
          name: "Player 1",
          score: 0,
          isHost: false,
          joinedAt: Date.now(),
          lives: 3,
          eliminated: false,
        });
      });

      // Both correct
      await t.run(async (ctx) => {
        await ctx.db.insert("answers", {
          roundId,
          playerId,
          gameId,
          artist: "Test Artist",
          title: "Test Song",
          submittedAt: Date.now(),
          artistCorrect: true,
          titleCorrect: true,
          points: 100,
        });
      });

      await t.mutation(internal.roundScheduler.transitionToEnded, { roundId });

      const player = await t.run(async (ctx) => ctx.db.get(playerId));
      expect(player?.eliminated).toBe(false);
      expect(player?.lives).toBe(3);
    });

    it("ends game when only one player remains", async () => {
      const t = convexTest(schema);
      const { gameId, roundId } = await setupBattleRoyaleGame(t);

      // Player 1: will survive
      const player1Id = await t.run(async (ctx) => {
        return await ctx.db.insert("players", {
          gameId,
          sessionId: "player-1",
          name: "Player 1",
          score: 0,
          isHost: true,
          joinedAt: Date.now(),
          lives: 3,
          eliminated: false,
        });
      });

      // Player 2: will be eliminated (both wrong)
      const player2Id = await t.run(async (ctx) => {
        return await ctx.db.insert("players", {
          gameId,
          sessionId: "player-2",
          name: "Player 2",
          score: 0,
          isHost: false,
          joinedAt: Date.now(),
          lives: 3,
          eliminated: false,
        });
      });

      // Player 1 gets both right
      await t.run(async (ctx) => {
        await ctx.db.insert("answers", {
          roundId,
          playerId: player1Id,
          gameId,
          artist: "Test Artist",
          title: "Test Song",
          submittedAt: Date.now(),
          artistCorrect: true,
          titleCorrect: true,
          points: 100,
        });
      });

      // Player 2 gets both wrong
      await t.run(async (ctx) => {
        await ctx.db.insert("answers", {
          roundId,
          playerId: player2Id,
          gameId,
          artist: "Nope",
          title: "Nope",
          submittedAt: Date.now(),
          artistCorrect: false,
          titleCorrect: false,
          points: 0,
        });
      });

      await t.mutation(internal.roundScheduler.transitionToEnded, { roundId });

      // Game should be finished
      const game = await t.run(async (ctx) => ctx.db.get(gameId));
      expect(game?.status).toBe("finished");
    });

    it("continues game in single player until player is eliminated", async () => {
      const t = convexTest(schema);

      // Single player battle royale
      const gameId = await t.run(async (ctx) => {
        return await ctx.db.insert("games", {
          code: "SOLO01",
          hostId: "host-session",
          status: "playing",
          currentRound: 1,
          createdAt: Date.now(),
          settings: {
            roundCount: 50,
            secondsPerRound: 30,
            gameMode: "battle_royale",
            hintsPerPlayer: 0,
            isSinglePlayer: true,
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
            correctArtist: "Test Artist",
            correctTitle: "Test Song",
            albumArt: "https://example.com/art.jpg",
          },
          phase: "active",
          activeAt: Date.now() - 10000,
        });
      });

      // Single player with 1 life left
      const playerId = await t.run(async (ctx) => {
        return await ctx.db.insert("players", {
          gameId,
          sessionId: "player-1",
          name: "Solo Player",
          score: 0,
          isHost: true,
          joinedAt: Date.now(),
          lives: 1,
          eliminated: false,
        });
      });

      // Gets one wrong, loses last life
      await t.run(async (ctx) => {
        await ctx.db.insert("answers", {
          roundId,
          playerId,
          gameId,
          artist: "Test Artist",
          title: "Wrong",
          submittedAt: Date.now(),
          artistCorrect: true,
          titleCorrect: false,
          points: 50,
        });
      });

      await t.mutation(internal.roundScheduler.transitionToEnded, { roundId });

      // Player eliminated, game finished
      const player = await t.run(async (ctx) => ctx.db.get(playerId));
      expect(player?.eliminated).toBe(true);

      const game = await t.run(async (ctx) => ctx.db.get(gameId));
      expect(game?.status).toBe("finished");
    });
  });
});
