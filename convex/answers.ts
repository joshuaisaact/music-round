import { v } from "convex/values";
import { query } from "./_generated/server";

export const listForRound = query({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, { roundId }) => {
    return await ctx.db
      .query("answers")
      .withIndex("by_round", (q) => q.eq("roundId", roundId))
      .collect();
  },
});
