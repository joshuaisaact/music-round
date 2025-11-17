import { createServerFn } from '@tanstack/react-start'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL

if (!CONVEX_URL) {
  throw new Error('VITE_CONVEX_URL environment variable is required')
}

/**
 * Server function to fetch daily leaderboard data
 * This runs on the server and can be called from route loaders
 */
export const getDailyLeaderboardData = createServerFn()
  .handler(async (input: { date: string; limit?: number }) => {
    const convex = new ConvexHttpClient(CONVEX_URL)

    const leaderboard = await convex.query(api.daily.getDailyLeaderboard, {
      date: input.date,
      limit: input.limit || 100,
    })

    return {
      leaderboard,
      date: input.date,
      fetchedAt: new Date().toISOString(),
    }
  })
