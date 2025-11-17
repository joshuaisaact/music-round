import type { Id } from "../../convex/_generated/dataModel";
import { PlayerRow } from "./PlayerRow";
import { usePlayerStandingsLogic } from "@/hooks/usePlayerStandingsLogic";

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

interface PlayerStandingsProps {
  players: Player[];
  currentPlayerId: Id<"players">;
  variant?: "compact" | "detailed";
  roundAnswers?: Answer[];
  showRankMedals?: boolean;
  showLives?: boolean;
}

export function PlayerStandings({
  players,
  currentPlayerId,
  variant = "compact",
  roundAnswers,
  showRankMedals = true,
  showLives = false,
}: PlayerStandingsProps) {
  const { sortedPlayers, shakingPlayers, getCheckmarks, getHintsUsed } = usePlayerStandingsLogic({
    players,
    roundAnswers,
    currentPlayerId,
  });

  const spacing = variant === "compact" ? "space-y-2" : "space-y-3";

  return (
    <div className={spacing}>
      {sortedPlayers.map((player, index) => (
        <PlayerRow
          key={player._id}
          player={player}
          rank={index}
          currentPlayerId={currentPlayerId}
          variant={variant}
          isShaking={shakingPlayers.has(player._id)}
          checkmarks={getCheckmarks(player._id)}
          hintsUsed={getHintsUsed(player._id)}
          showRankMedals={showRankMedals}
          showLives={showLives}
        />
      ))}
    </div>
  );
}
