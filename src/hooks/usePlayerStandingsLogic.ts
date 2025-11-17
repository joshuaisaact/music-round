import { useEffect, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { usePrevious } from "../lib/hooks";

interface Player {
  _id: Id<"players">;
  name: string;
  score: number;
  lives?: number;
  eliminated?: boolean;
}

interface Answer {
  _id: Id<"answers">;
  playerId: Id<"players">;
  artistCorrect: boolean;
  titleCorrect: boolean;
  attempts?: number;
  hintsUsed?: number;
}

interface UsePlayerStandingsLogicProps {
  players: Player[];
  roundAnswers?: Answer[];
  currentPlayerId: Id<"players">;
}

export function usePlayerStandingsLogic({
  players,
  roundAnswers,
  currentPlayerId,
}: UsePlayerStandingsLogicProps) {
  const sortedPlayers = players.toSorted((a, b) => b.score - a.score);
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

  return {
    sortedPlayers,
    shakingPlayers,
    getCheckmarks,
    getHintsUsed,
  };
}
