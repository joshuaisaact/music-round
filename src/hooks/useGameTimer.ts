import { useState, useEffect } from "react";
import type { Doc } from "../../convex/_generated/dataModel";

interface UseGameTimerParams {
  currentRound: Doc<"rounds"> | null | undefined;
  game: Doc<"games"> | null | undefined;
}

export function useGameTimer({ currentRound, game }: UseGameTimerParams) {
  const [now, setNow] = useState(Date.now());

  // Update clock every second for timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate time remaining based on server timestamps
  const phase = currentRound?.phase || "preparing";
  let timeRemaining: number | null = null;

  if (currentRound) {
    if (phase === "preparing" && currentRound.startedAt) {
      const elapsed = Math.floor((now - currentRound.startedAt) / 1000);
      timeRemaining = Math.max(0, 3 - elapsed);
    } else if (phase === "active" && currentRound.activeAt && game) {
      const elapsed = Math.floor((now - currentRound.activeAt) / 1000);
      timeRemaining = Math.max(0, game.settings.secondsPerRound - elapsed);
    }
  }

  return {
    now,
    phase,
    timeRemaining,
  };
}
