import { PixelButton } from "../PixelButton";
import type { Doc } from "../../../convex/_generated/dataModel";

interface HostControlsProps {
  isHost: boolean;
  game: Doc<"games">;
  currentPlayer: Doc<"players">;
  roundAnswers: Doc<"answers">[] | undefined;
  players: Doc<"players">[] | undefined;
  currentRoundNumber: number;
  totalRounds: number;
  isAdvancing: boolean;
  isBattleRoyale: boolean;
  onNextRound: () => void;
}

export function HostControls({
  isHost,
  game,
  currentPlayer,
  roundAnswers,
  players,
  currentRoundNumber,
  totalRounds,
  isAdvancing,
  isBattleRoyale,
  onNextRound,
}: HostControlsProps) {
  if (!isHost) return null;

  // For single player mode, only show next round button if both artist and title are correct
  if (game.settings.isSinglePlayer) {
    const myAnswer = roundAnswers?.find((a) => a.playerId === currentPlayer._id);
    const canAdvance = myAnswer?.artistCorrect && myAnswer?.titleCorrect;

    if (!canAdvance) {
      return null;
    }
  }

  const allPlayersSubmitted = (roundAnswers?.length || 0) === (players?.length || 0);

  const getNextRoundButtonText = () => {
    if (isAdvancing) return "ADVANCING...";
    // For battle royale, never show "FINISH GAME" - game ends automatically on elimination
    if (isBattleRoyale) return "NEXT ROUND";
    if (currentRoundNumber === totalRounds) return "FINISH GAME";
    return "NEXT ROUND";
  };

  return (
    <section className="bg-yellow-100 border-4 border-yellow-600 p-6" aria-labelledby="host-controls">
      <h2 id="host-controls" className="sr-only">Host Controls</h2>
      <PixelButton
        onClick={onNextRound}
        variant="warning"
        className="w-full"
        disabled={isAdvancing}
        aria-label={isAdvancing ? "Advancing to next round..." : currentRoundNumber === totalRounds ? "Finish game" : "Advance to next round"}
      >
        {getNextRoundButtonText()}
      </PixelButton>
      {!allPlayersSubmitted && !game.settings.isSinglePlayer && (
        <p className="pixel-text text-yellow-800 text-xs mt-3 text-center" role="status" aria-live="polite">
          {roundAnswers?.length}/{players?.length} PLAYERS SUBMITTED
        </p>
      )}
    </section>
  );
}
