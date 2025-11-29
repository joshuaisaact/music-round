import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

/**
 * Full game lifecycle integration test.
 * Tests the critical path: create → join → start → play → finish
 */
describe("game flow", () => {
  it("completes a full multiplayer game", async () => {
    const t = convexTest(schema);

    // 1. Host creates game
    const { gameId, code } = await t.mutation(api.games.create, {
      hostId: "host-session",
      settings: {
        roundCount: 2,
        secondsPerRound: 30,
        hintsPerPlayer: 2,
      },
    });
    expect(code).toBeDefined();

    // 2. Host joins as player
    const hostPlayerId = await t.mutation(api.players.join, {
      code,
      sessionId: "host-session",
      name: "Alice",
    });

    // 3. Another player joins
    const player2Id = await t.mutation(api.players.join, {
      code,
      sessionId: "player-2-session",
      name: "Bob",
    });

    // Verify both players in lobby
    const players = await t.query(api.players.list, { gameId });
    expect(players).toHaveLength(2);

    // 4. Create rounds manually (simulating what the start action does)
    const round1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("rounds", {
        gameId,
        roundNumber: 0,
        songData: {
          spotifyId: "song1",
          previewURL: "https://example.com/song1.mp3",
          correctArtist: "Queen",
          correctTitle: "Bohemian Rhapsody",
          albumArt: "https://example.com/album1.jpg",
        },
        phase: "preparing",
      });
    });

    await t.run(async (ctx) => {
      return await ctx.db.insert("rounds", {
        gameId,
        roundNumber: 1,
        songData: {
          spotifyId: "song2",
          previewURL: "https://example.com/song2.mp3",
          correctArtist: "The Beatles",
          correctTitle: "Hey Jude",
          albumArt: "https://example.com/album2.jpg",
        },
        phase: "preparing",
      });
    });

    // 5. Start the game
    await t.mutation(internal.games.startGame, { gameId });

    let game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game?.status).toBe("playing");

    // 6. Transition round to active
    await t.mutation(internal.roundScheduler.transitionToActive, { roundId: round1Id });

    const round1 = await t.run(async (ctx) => ctx.db.get(round1Id));
    expect(round1?.phase).toBe("active");

    // 7. Players submit answers for round 1
    const alice1 = await t.mutation(api.answers.submit, {
      roundId: round1Id,
      playerId: hostPlayerId,
      artist: "Queen",
      title: "Bohemian Rhapsody",
    });
    expect(alice1.artistCorrect).toBe(true);
    expect(alice1.titleCorrect).toBe(true);

    const bob1 = await t.mutation(api.answers.submit, {
      roundId: round1Id,
      playerId: player2Id,
      artist: "Queen",
      title: "We Will Rock You", // Wrong title
    });
    expect(bob1.artistCorrect).toBe(true);
    expect(bob1.titleCorrect).toBe(false);

    // Bob tries again
    const bob1Retry = await t.mutation(api.answers.submit, {
      roundId: round1Id,
      playerId: player2Id,
      artist: "Queen",
      title: "Bohemian Rhapsody",
    });
    expect(bob1Retry.titleCorrect).toBe(true);
    expect(bob1Retry.attempts).toBe(2);

    // 8. End round 1, start round 2
    await t.mutation(internal.roundScheduler.transitionToEnded, { roundId: round1Id });

    game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game?.currentRound).toBe(1);

    // Get round 2 and transition to active
    const round2 = await t.run(async (ctx) => {
      return await ctx.db
        .query("rounds")
        .withIndex("by_game_and_number", (q) => q.eq("gameId", gameId).eq("roundNumber", 1))
        .first();
    });

    await t.mutation(internal.roundScheduler.transitionToActive, { roundId: round2!._id });

    // 9. Players submit for round 2
    await t.mutation(api.answers.submit, {
      roundId: round2!._id,
      playerId: hostPlayerId,
      artist: "Beatles",
      title: "Hey Jude",
    });

    await t.mutation(api.answers.submit, {
      roundId: round2!._id,
      playerId: player2Id,
      artist: "Beatles",
      title: "Hey Jude",
    });

    // 10. End round 2 - game should finish
    await t.mutation(internal.roundScheduler.transitionToEnded, { roundId: round2!._id });

    game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game?.status).toBe("finished");

    // 11. Check final scores
    const finalPlayers = await t.query(api.players.list, { gameId });
    const alice = finalPlayers.find((p) => p.name === "Alice");
    const bob = finalPlayers.find((p) => p.name === "Bob");

    expect(alice?.score).toBeGreaterThan(0);
    expect(bob?.score).toBeGreaterThan(0);
  });

  it("handles battle royale elimination", async () => {
    const t = convexTest(schema);

    // Create battle royale game
    const { gameId, code } = await t.mutation(api.games.create, {
      hostId: "host-session",
      settings: {
        roundCount: 5,
        secondsPerRound: 30,
        playlistTag: "rock",
        gameMode: "battle_royale",
      },
    });

    // Player joins (battle royale auto-sets 3 lives)
    const playerId = await t.mutation(api.players.join, {
      code,
      sessionId: "host-session",
      name: "Player1",
    });

    // Verify lives were set
    const playerBefore = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(playerBefore?.lives).toBe(3);

    // Create a round
    const roundId = await t.run(async (ctx) => {
      return await ctx.db.insert("rounds", {
        gameId,
        roundNumber: 0,
        songData: {
          spotifyId: "song1",
          previewURL: "https://example.com/song1.mp3",
          correctArtist: "Nirvana",
          correctTitle: "Smells Like Teen Spirit",
          albumArt: "https://example.com/album.jpg",
        },
        phase: "active",
        activeAt: Date.now(),
      });
    });

    // Start game
    await t.run(async (ctx) => {
      await ctx.db.patch(gameId, { status: "playing", currentRound: 0 });
    });

    // Player gets artist right but title wrong (loses 1 life, not eliminated)
    await t.mutation(api.answers.submit, {
      roundId,
      playerId,
      artist: "Nirvana",
      title: "Wrong Song",
    });

    // End round - should lose a life
    await t.mutation(internal.roundScheduler.transitionToEnded, { roundId });

    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player?.lives).toBe(2);
    expect(player?.eliminated).toBeFalsy();
  });
});
