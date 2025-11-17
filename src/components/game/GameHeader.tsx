import type { Doc } from "../../../convex/_generated/dataModel";
import type { PointsDisplay } from "@/lib/pointsCalculator";
import { formatDate } from "@/lib/dateUtils";

interface GameHeaderProps {
  game: Doc<"games">;
  currentPlayer: Doc<"players">;
  currentRoundNumber: number;
  totalRounds: number;
  timeRemaining: number | null;
  phase: string;
  availablePoints: PointsDisplay;
  isDailyMode: boolean;
  isBattleRoyale: boolean;
  isEliminated: boolean;
}

export function GameHeader({
  game,
  currentPlayer,
  currentRoundNumber,
  totalRounds,
  timeRemaining,
  phase,
  availablePoints,
  isDailyMode,
  isBattleRoyale,
  isEliminated,
}: GameHeaderProps) {
  return (
    <header className="mb-6 space-y-4">
      {/* Daily Challenge Banner */}
      {isDailyMode && (
        <div className="px-6 py-4 border-4 bg-yellow-400 border-yellow-600 text-center">
          <p className="pixel-text text-sky-900 text-xl md:text-2xl">
            🎵 DAILY CHALLENGE - {formatDate()}
          </p>
        </div>
      )}

      {/* Eliminated Banner */}
      {isBattleRoyale && isEliminated && (
        <div className="px-6 py-4 border-4 bg-red-600 border-red-900 text-center">
          <p className="pixel-text text-white text-xl md:text-2xl">
            💀 ELIMINATED - ROUND {(currentPlayer.eliminatedAtRound ?? 0) + 1}
          </p>
          <p className="pixel-text text-red-100 text-sm mt-2">
            KEEP PLAYING FOR FUN! (NO POINTS)
          </p>
        </div>
      )}

      {/* Timer and Points */}
      {timeRemaining !== null && phase === "active" && (
        <div className="flex justify-between items-center gap-4 flex-wrap">
          {/* Song Counter and Lives */}
          <div className="flex items-center gap-4">
            <div className="px-6 py-3 border-4 bg-white border-sky-900">
              <p className="pixel-text text-sky-900 text-2xl md:text-3xl">
                {isBattleRoyale ? `SONG ${currentRoundNumber}` : `SONG ${currentRoundNumber}/${totalRounds}`}
              </p>
            </div>

            {/* Battle Royale Lives Display */}
            {isBattleRoyale && (
              <div className="px-6 py-3 border-4 bg-white border-sky-900">
                <div className="pixel-text text-sky-900 text-2xl md:text-3xl flex items-center gap-2">
                  <span className="hidden sm:inline">LIVES:</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <img
                        key={`heart-${i}`}
                        src="/heart.svg"
                        alt=""
                        width="24"
                        height="24"
                        aria-hidden="true"
                        className={`${i >= (currentPlayer?.lives ?? 3) ? "opacity-20" : ""}`}
                      />
                    ))}
                  </div>
                  <span className="ml-1">{currentPlayer?.lives ?? 3}</span>
                </div>
              </div>
            )}
          </div>

          {/* Timer */}
          <div
            className={`
              px-6 py-3 border-4
              ${
                timeRemaining <= game.settings.secondsPerRound * 0.17
                  ? "bg-red-500 border-red-800 animate-pulse"
                  : timeRemaining <= game.settings.secondsPerRound * 0.5
                    ? "bg-yellow-300 border-yellow-600"
                    : "bg-green-300 border-green-600"
              }
            `}
            role="timer"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="pixel-text text-2xl md:text-3xl flex items-center gap-2" aria-label={`${timeRemaining} seconds remaining`}>
              <img src="/clock.svg" alt="" width="28" height="28" aria-hidden="true" />
              {Math.floor(timeRemaining / 60)}:
              {(timeRemaining % 60).toString().padStart(2, "0")}
            </p>
          </div>

          {/* Points Display */}
          <div
            className={`
              px-6 py-3 border-4
              ${
                availablePoints.isLocked
                  ? "bg-green-300 border-green-600"
                  : timeRemaining <= game.settings.secondsPerRound * 0.17
                    ? "bg-red-500 border-red-800 animate-pulse"
                    : timeRemaining <= game.settings.secondsPerRound * 0.5
                      ? "bg-yellow-300 border-yellow-600"
                      : "bg-green-300 border-green-600"
              }
            `}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="pixel-text text-2xl md:text-3xl" aria-label={`${availablePoints.total} points available`}>
              {availablePoints.isLocked ? (
                <>{availablePoints.total}PTS</>
              ) : availablePoints.lockedArtistPoints && availablePoints.lockedTitlePoints ? (
                <>{availablePoints.total}PTS</>
              ) : availablePoints.lockedArtistPoints ? (
                <>
                  <span className="opacity-75">{availablePoints.lockedArtistPoints}</span>
                  {" + "}
                  {availablePoints.titlePoints}PTS
                </>
              ) : availablePoints.lockedTitlePoints ? (
                <>
                  {availablePoints.artistPoints}
                  {" + "}
                  <span className="opacity-75">{availablePoints.lockedTitlePoints}</span>PTS
                </>
              ) : (
                <>{availablePoints.total}PTS</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Show song counter when timer is not active */}
      {(timeRemaining === null || phase !== "active") && (
        <div className="flex justify-center gap-4">
          <div className="px-6 py-3 border-4 bg-white border-sky-900">
            <p className="pixel-text text-sky-900 text-2xl md:text-3xl">
              {isBattleRoyale ? `SONG ${currentRoundNumber}` : `SONG ${currentRoundNumber}/${totalRounds}`}
            </p>
          </div>

          {/* Battle Royale Lives Display */}
          {isBattleRoyale && (
            <div className="px-6 py-3 border-4 bg-white border-sky-900">
              <div className="pixel-text text-sky-900 text-2xl md:text-3xl flex items-center gap-2">
                <span className="hidden sm:inline">LIVES:</span>
                <div className="flex gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <img
                      key={`heart-${i}`}
                      src="/heart.svg"
                      alt=""
                      width="24"
                      height="24"
                      aria-hidden="true"
                      className={`${i >= (currentPlayer?.lives ?? 3) ? "opacity-20" : ""}`}
                    />
                  ))}
                </div>
                <span className="ml-1">{currentPlayer?.lives ?? 3}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
