import type { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { usePrevious } from "../lib/hooks";

interface Player {
  _id: Id<"players">;
  name: string;
  score: number;
}

interface Answer {
  _id: Id<"answers">;
  playerId: Id<"players">;
  artistCorrect: boolean;
  titleCorrect: boolean;
  attempts?: number;
  hintsUsed?: number;
}

interface PlayerStandingsProps {
  players: Player[];
  currentPlayerId: Id<"players">;
  variant?: "compact" | "detailed";
  roundAnswers?: Answer[];
}

export function PlayerStandings({
  players,
  currentPlayerId,
  variant = "compact",
  roundAnswers,
}: PlayerStandingsProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const [shakingPlayers, setShakingPlayers] = useState<Set<Id<"players">>>(new Set());
  const previousAnswers = usePrevious(roundAnswers);

  // Detect wrong answers and trigger shake animation
  useEffect(() => {
    if (!roundAnswers || !previousAnswers) return;

    const newShakes = new Set<Id<"players">>();

    roundAnswers.forEach((currentAnswer) => {
      // Skip current player - they get their own feedback
      if (currentAnswer.playerId === currentPlayerId) return;

      const previousAnswer = previousAnswers.find(
        (a) => a.playerId === currentAnswer.playerId
      );

      // If attempts increased but answer is still wrong
      if (previousAnswer) {
        const attemptsIncreased =
          (currentAnswer.attempts || 0) > (previousAnswer.attempts || 0);
        const stillWrong = !currentAnswer.artistCorrect || !currentAnswer.titleCorrect;

        if (attemptsIncreased && stillWrong) {
          newShakes.add(currentAnswer.playerId);
        }
      }
    });

    if (newShakes.size > 0) {
      setShakingPlayers(newShakes);
      // Clear shake animation after 500ms
      setTimeout(() => {
        setShakingPlayers(new Set());
      }, 500);
    }
  }, [roundAnswers, previousAnswers, currentPlayerId]);

  // Get checkmark count for a player
  const getCheckmarks = (playerId: Id<"players">): number => {
    if (!roundAnswers) return 0;

    const answer = roundAnswers.find((a) => a.playerId === playerId);
    if (!answer) return 0;

    const correctCount =
      (answer.artistCorrect ? 1 : 0) + (answer.titleCorrect ? 1 : 0);
    return correctCount;
  };

  // Get hints used for a player
  const getHintsUsed = (playerId: Id<"players">): number => {
    if (!roundAnswers) return 0;

    const answer = roundAnswers.find((a) => a.playerId === playerId);
    if (!answer) return 0;

    return answer.hintsUsed ?? 0;
  };

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        {sortedPlayers.map((player, index) => {
          const isShaking = shakingPlayers.has(player._id);
          const checkmarks = getCheckmarks(player._id);
          const hintsUsed = getHintsUsed(player._id);

          return (
            <div
              key={player._id}
              className={`
                border-2 p-3 flex text-lg items-center justify-between transition-colors
                bg-sky-100 border-sky-600
                ${isShaking ? "shake bg-red-100 !border-red-600" : checkmarks === 2 ? "!border-4 !border-green-600" : ""}
              `}
            >
              <div className="flex items-center gap-1">
                {index === 0 ? (
                  <>
                    <img src="/medal-1.svg" alt="" width="24" height="24" aria-hidden="true" className="mr-1" />
                    <span className="pixel-text text-base font-bold truncate max-w-[150px]">
                      {player.name.toUpperCase()}
                      {player._id === currentPlayerId && " (YOU)"}
                    </span>
                  </>
                ) : index === 1 ? (
                  <>
                    <img src="/medal-2.svg" alt="" width="24" height="24" aria-hidden="true" className="mr-1" />
                    <span className="pixel-text text-base font-bold truncate max-w-[150px]">
                      {player.name.toUpperCase()}
                      {player._id === currentPlayerId && " (YOU)"}
                    </span>
                  </>
                ) : index === 2 ? (
                  <>
                    <img src="/medal-3.svg" alt="" width="24" height="24" aria-hidden="true" className="mr-1" />
                    <span className="pixel-text text-base font-bold truncate max-w-[150px]">
                      {player.name.toUpperCase()}
                      {player._id === currentPlayerId && " (YOU)"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="pixel-text text-lg mr-1">{index + 1}.</span>
                    <span className="pixel-text text-base font-bold truncate max-w-[150px]">
                      {player.name.toUpperCase()}
                      {player._id === currentPlayerId && " (YOU)"}
                    </span>
                  </>
                )}
                {checkmarks > 0 && (
                  <span className="text-green-600 text-base font-bold">
                    {checkmarks === 2 ? "✓✓" : "✓"}
                  </span>
                )}
                {hintsUsed > 0 && (
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: hintsUsed }).map((_, i) => (
                      <img key={i} src="/light-bulb.svg" alt="" width="12" height="12" aria-hidden="true" />
                    ))}
                  </span>
                )}
              </div>
              <span className="pixel-text text-lg font-bold">{player.score}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedPlayers.map((player, index) => {
        const isShaking = shakingPlayers.has(player._id);
        const checkmarks = getCheckmarks(player._id);
        const hintsUsed = getHintsUsed(player._id);

        return (
          <div
            key={player._id}
            className={`
              border-4 p-4 flex items-center justify-between transition-colors
              ${
                index === 0
                  ? "bg-yellow-100 border-yellow-600"
                  : index === 1
                    ? "bg-gray-100 border-gray-400"
                    : index === 2
                      ? "bg-orange-100 border-orange-600"
                      : "bg-sky-50 border-sky-300"
              }
              ${isShaking ? "shake bg-red-100 !border-red-600" : checkmarks === 2 ? "!border-[6px] !border-green-600" : ""}
            `}
          >
            <div className="flex items-center">
              {index === 0 ? (
                <>
                  <img src="/medal-1.svg" alt="" width="36" height="36" aria-hidden="true" className="mr-2" />
                  <div>
                    <p className="pixel-text text-lg md:text-xl font-bold flex items-center gap-2">
                      <span>
                        {player.name.toUpperCase()}
                        {player._id === currentPlayerId && " (YOU)"}
                      </span>
                      {checkmarks > 0 && (
                        <span className="text-green-600 text-lg font-bold">
                          {checkmarks === 2 ? "✓✓" : "✓"}
                        </span>
                      )}
                      {hintsUsed > 0 && (
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: hintsUsed }).map((_, i) => (
                            <img key={i} src="/light-bulb.svg" alt="" width="14" height="14" aria-hidden="true" />
                          ))}
                        </span>
                      )}
                    </p>
                  </div>
                </>
              ) : index === 1 ? (
                <>
                  <img src="/medal-2.svg" alt="" width="36" height="36" aria-hidden="true" className="mr-2" />
                  <div>
                    <p className="pixel-text text-lg md:text-xl font-bold flex items-center gap-2">
                      <span>
                        {player.name.toUpperCase()}
                        {player._id === currentPlayerId && " (YOU)"}
                      </span>
                      {checkmarks > 0 && (
                        <span className="text-green-600 text-lg font-bold">
                          {checkmarks === 2 ? "✓✓" : "✓"}
                        </span>
                      )}
                      {hintsUsed > 0 && (
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: hintsUsed }).map((_, i) => (
                            <img key={i} src="/light-bulb.svg" alt="" width="14" height="14" aria-hidden="true" />
                          ))}
                        </span>
                      )}
                    </p>
                  </div>
                </>
              ) : index === 2 ? (
                <>
                  <img src="/medal-3.svg" alt="" width="36" height="36" aria-hidden="true" className="mr-2" />
                  <div>
                    <p className="pixel-text text-lg md:text-xl font-bold flex items-center gap-2">
                      <span>
                        {player.name.toUpperCase()}
                        {player._id === currentPlayerId && " (YOU)"}
                      </span>
                      {checkmarks > 0 && (
                        <span className="text-green-600 text-lg font-bold">
                          {checkmarks === 2 ? "✓✓" : "✓"}
                        </span>
                      )}
                      {hintsUsed > 0 && (
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: hintsUsed }).map((_, i) => (
                            <img key={i} src="/light-bulb.svg" alt="" width="14" height="14" aria-hidden="true" />
                          ))}
                        </span>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <span className="pixel-text text-2xl md:text-3xl w-12">{index + 1}.</span>
                  <div>
                    <p className="pixel-text text-lg md:text-xl font-bold flex items-center gap-2">
                      <span>
                        {player.name.toUpperCase()}
                        {player._id === currentPlayerId && " (YOU)"}
                      </span>
                      {checkmarks > 0 && (
                        <span className="text-green-600 text-lg font-bold">
                          {checkmarks === 2 ? "✓✓" : "✓"}
                        </span>
                      )}
                      {hintsUsed > 0 && (
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: hintsUsed }).map((_, i) => (
                            <img key={i} src="/light-bulb.svg" alt="" width="14" height="14" aria-hidden="true" />
                          ))}
                        </span>
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
            <p className="pixel-text text-2xl md:text-3xl font-bold">{player.score}</p>
          </div>
        );
      })}
    </div>
  );
}
