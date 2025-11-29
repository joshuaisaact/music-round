import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

describe("games", () => {
  describe("create", () => {
    it("creates a game with lobby status", async () => {
      const t = convexTest(schema);

      const { gameId, code } = await t.mutation(api.games.create, {
        hostId: "host-session-123",
        settings: {
          roundCount: 5,
          secondsPerRound: 30,
        },
      });

      expect(gameId).toBeDefined();
      expect(code).toMatch(/^[A-Z]{4}\d{3}$/); // e.g., ROCK123

      const game = await t.run(async (ctx) => ctx.db.get(gameId));
      expect(game?.status).toBe("lobby");
      expect(game?.currentRound).toBe(0);
      expect(game?.hostId).toBe("host-session-123");
    });

    it("stores provided settings", async () => {
      const t = convexTest(schema);

      const { gameId } = await t.mutation(api.games.create, {
        hostId: "host-123",
        settings: {
          roundCount: 8,
          secondsPerRound: 45,
          playlistTag: "80s-hits",
          hintsPerPlayer: 5,
        },
      });

      const game = await t.run(async (ctx) => ctx.db.get(gameId));
      expect(game?.settings.roundCount).toBe(8);
      expect(game?.settings.secondsPerRound).toBe(45);
      expect(game?.settings.playlistTag).toBe("80s-hits");
      expect(game?.settings.hintsPerPlayer).toBe(5);
    });

    it("forces settings for daily mode", async () => {
      const t = convexTest(schema);

      const { gameId } = await t.mutation(api.games.create, {
        hostId: "host-123",
        settings: {
          roundCount: 10, // Should be overridden to 5
          secondsPerRound: 60, // Should be overridden to 30
          gameMode: "daily",
        },
      });

      const game = await t.run(async (ctx) => ctx.db.get(gameId));
      expect(game?.settings.roundCount).toBe(5);
      expect(game?.settings.secondsPerRound).toBe(30);
      expect(game?.settings.playlistTag).toBe("daily-songs");
      expect(game?.settings.isSinglePlayer).toBe(true);
      expect(game?.settings.hintsPerPlayer).toBe(3);
    });

    it("forces settings for battle royale mode", async () => {
      const t = convexTest(schema);

      const { gameId } = await t.mutation(api.games.create, {
        hostId: "host-123",
        settings: {
          roundCount: 5, // Should be overridden to 50
          secondsPerRound: 60, // Should be overridden to 30
          playlistTag: "rock-classics",
          gameMode: "battle_royale",
        },
      });

      const game = await t.run(async (ctx) => ctx.db.get(gameId));
      expect(game?.settings.roundCount).toBe(50);
      expect(game?.settings.secondsPerRound).toBe(30);
      expect(game?.settings.playlistTag).toBe("rock-classics"); // Preserves playlist
      expect(game?.settings.isSinglePlayer).toBe(true);
    });
  });

  describe("get", () => {
    it("retrieves a game by id", async () => {
      const t = convexTest(schema);

      const { gameId } = await t.mutation(api.games.create, {
        hostId: "host-123",
        settings: { roundCount: 5, secondsPerRound: 30 },
      });

      const game = await t.query(api.games.get, { gameId });
      expect(game).not.toBeNull();
      expect(game?.hostId).toBe("host-123");
    });
  });

  describe("getByCode", () => {
    it("retrieves a game by code", async () => {
      const t = convexTest(schema);

      const { code } = await t.mutation(api.games.create, {
        hostId: "host-123",
        settings: { roundCount: 5, secondsPerRound: 30 },
      });

      const game = await t.query(api.games.getByCode, { code });
      expect(game).not.toBeNull();
      expect(game?.code).toBe(code);
    });

    it("returns null for non-existent code", async () => {
      const t = convexTest(schema);

      const game = await t.query(api.games.getByCode, { code: "FAKE999" });
      expect(game).toBeNull();
    });
  });

  describe("updateSettings", () => {
    it("updates settings when game is in lobby", async () => {
      const t = convexTest(schema);

      const { gameId } = await t.mutation(api.games.create, {
        hostId: "host-123",
        settings: { roundCount: 5, secondsPerRound: 30 },
      });

      await t.mutation(api.games.updateSettings, {
        gameId,
        settings: {
          roundCount: 10,
          secondsPerRound: 45,
          playlistTag: "new-playlist",
        },
      });

      const game = await t.run(async (ctx) => ctx.db.get(gameId));
      expect(game?.settings.roundCount).toBe(10);
      expect(game?.settings.secondsPerRound).toBe(45);
      expect(game?.settings.playlistTag).toBe("new-playlist");
    });

    it("rejects update when game has started", async () => {
      const t = convexTest(schema);

      const gameId = await t.run(async (ctx) => {
        return await ctx.db.insert("games", {
          code: "TEST123",
          hostId: "host-123",
          status: "playing",
          currentRound: 1,
          createdAt: Date.now(),
          settings: { roundCount: 5, secondsPerRound: 30 },
        });
      });

      await expect(
        t.mutation(api.games.updateSettings, {
          gameId,
          settings: { roundCount: 10, secondsPerRound: 45 },
        })
      ).rejects.toThrow("Cannot update settings after game has started");
    });

    it("rejects update for daily mode games", async () => {
      const t = convexTest(schema);

      const { gameId } = await t.mutation(api.games.create, {
        hostId: "host-123",
        settings: { roundCount: 5, secondsPerRound: 30, gameMode: "daily" },
      });

      await expect(
        t.mutation(api.games.updateSettings, {
          gameId,
          settings: { roundCount: 10, secondsPerRound: 45 },
        })
      ).rejects.toThrow("Cannot update settings for this game mode");
    });

    it("rejects update for battle royale games", async () => {
      const t = convexTest(schema);

      const { gameId } = await t.mutation(api.games.create, {
        hostId: "host-123",
        settings: {
          roundCount: 5,
          secondsPerRound: 30,
          playlistTag: "rock",
          gameMode: "battle_royale",
        },
      });

      await expect(
        t.mutation(api.games.updateSettings, {
          gameId,
          settings: { roundCount: 10, secondsPerRound: 45 },
        })
      ).rejects.toThrow("Cannot update settings for this game mode");
    });
  });
});
