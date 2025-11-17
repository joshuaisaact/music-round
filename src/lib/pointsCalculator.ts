import type { Doc } from "../../convex/_generated/dataModel";

export interface PointsDisplay {
  artistPoints: number;
  titlePoints: number;
  lockedArtistPoints?: number;
  lockedTitlePoints?: number;
  total: number;
  isLocked: boolean;
}

interface CalculateAvailablePointsParams {
  phase: string;
  currentRound: Doc<"rounds">;
  game: Doc<"games">;
  now: number;
  isFullyLocked: boolean;
  artistLocked: boolean;
  titleLocked: boolean;
  roundAnswers: Doc<"answers">[] | undefined;
  currentPlayerId: string;
}

export function calculateComponentPoints(
  secondsElapsed: number,
  totalSeconds: number
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
  const pointsAvailable =
    maxPoints - ((maxPoints - minPoints) / adjustedTotal) * adjustedElapsed;

  return Math.ceil(pointsAvailable);
}

export function getAvailablePoints(
  params: CalculateAvailablePointsParams
): PointsDisplay {
  const {
    phase,
    currentRound,
    game,
    now,
    isFullyLocked,
    artistLocked,
    titleLocked,
    roundAnswers,
    currentPlayerId,
  } = params;

  if (phase !== "active" || !currentRound.activeAt) {
    return {
      artistPoints: 500,
      titlePoints: 500,
      total: 1000,
      isLocked: false,
    };
  }

  const elapsed = Math.floor((now - currentRound.activeAt) / 1000);
  const totalSeconds = game.settings.secondsPerRound;

  // If fully locked, show the locked points
  if (isFullyLocked) {
    const myAnswer = roundAnswers?.find((a) => a.playerId === currentPlayerId);
    return {
      artistPoints: 0,
      titlePoints: 0,
      total: myAnswer?.points || 0,
      isLocked: true,
    };
  }

  // Calculate points for each component
  const artistPoints = artistLocked
    ? 0
    : calculateComponentPoints(elapsed, totalSeconds);
  const titlePoints = titleLocked
    ? 0
    : calculateComponentPoints(elapsed, totalSeconds);

  // Get locked points from existing answer
  let lockedArtistPoints = 0;
  let lockedTitlePoints = 0;

  if (artistLocked || titleLocked) {
    const myAnswer = roundAnswers?.find((a) => a.playerId === currentPlayerId);
    if (myAnswer) {
      if (artistLocked && myAnswer.artistLockedAt && currentRound.activeAt) {
        const artistSecondsElapsed = Math.floor(
          (myAnswer.artistLockedAt - currentRound.activeAt) / 1000
        );
        lockedArtistPoints = calculateComponentPoints(
          artistSecondsElapsed,
          totalSeconds
        );
      }
      if (titleLocked && myAnswer.titleLockedAt && currentRound.activeAt) {
        const titleSecondsElapsed = Math.floor(
          (myAnswer.titleLockedAt - currentRound.activeAt) / 1000
        );
        lockedTitlePoints = calculateComponentPoints(
          titleSecondsElapsed,
          totalSeconds
        );
      }
    }
  }

  const total =
    lockedArtistPoints + lockedTitlePoints + artistPoints + titlePoints;

  return {
    artistPoints: artistLocked ? lockedArtistPoints : artistPoints,
    titlePoints: titleLocked ? lockedTitlePoints : titlePoints,
    lockedArtistPoints: artistLocked ? lockedArtistPoints : 0,
    lockedTitlePoints: titleLocked ? lockedTitlePoints : 0,
    total,
    isLocked: false,
  };
}
