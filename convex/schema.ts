import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  games: defineTable({
    code: v.string(),
    hostId: v.string(),
    status: v.union(
      v.literal("lobby"),
      v.literal("playing"),
      v.literal("finished"),
    ),
    currentRound: v.number(),
    settings: v.object({
      roundCount: v.number(),
      secondsPerRound: v.number(),
    }),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status"]),
  players: defineTable({
    gameId: v.id("games"),
    sessionId: v.string(),
    name: v.string(),
    score: v.number(),
    isHost: v.boolean(),
    ready: v.optional(v.boolean()),
    avatar: v.optional(v.string()),
    joinedAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_session", ["gameId", "sessionId"]),
  rounds: defineTable({
    gameId: v.id("games"),
    roundNumber: v.number(),
    songData: v.object({
      spotifyId: v.string(),
      previewURL: v.string(),
      correctArtist: v.string(),
      correctTitle: v.string(),
      albumArt: v.string(),
      releaseYear: v.optional(v.number()),
    }),
    phase: v.optional(v.union(
      v.literal("preparing"),
      v.literal("active"),
      v.literal("ended"),
    )),
    startedAt: v.optional(v.number()),
    activeAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  })
    .index("by_game", ["gameId"])
    .index("by_game_and_number", ["gameId", "roundNumber"]),
  answers: defineTable({
    roundId: v.id("rounds"),
    playerId: v.id("players"),
    gameId: v.id("games"),
    artist: v.string(),
    title: v.string(),
    submittedAt: v.number(),
    points: v.number(),
    artistCorrect: v.boolean(),
    titleCorrect: v.boolean(),
    attempts: v.optional(v.number()),
    lockedAt: v.optional(v.number()),
    artistLockedAt: v.optional(v.number()),
    titleLockedAt: v.optional(v.number()),
  })
    .index("by_round", ["roundId"])
    .index("by_player", ["playerId"])
    .index("by_game", ["gameId"]),
  songs: defineTable({
    artist: v.string(),
    title: v.string(),
    spotifyId: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  }),
});
