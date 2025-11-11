import type { Id } from "../../convex/_generated/dataModel";

interface Player {
  _id: Id<"players">;
  name: string;
  score: number;
}

interface PlayerStandingsProps {
  players: Player[];
  currentPlayerId: Id<"players">;
  variant?: "compact" | "detailed";
}

export function PlayerStandings({
  players,
  currentPlayerId,
  variant = "compact",
}: PlayerStandingsProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        {sortedPlayers.map((player, index) => (
          <div
            key={player._id}
            className={`
              border-2 p-3 flex text-lg items-center justify-between
              ${index === 0 ? "bg-yellow-100 border-yellow-600" : "bg-sky-100 border-sky-600"}
              ${player._id === currentPlayerId ? "ring-2 ring-sky-900" : ""}
            `}
          >
            <div className="flex items-center gap-2">
              <span className="pixel-text text-lg">
                {index === 0
                  ? "🥇"
                  : index === 1
                    ? "🥈"
                    : index === 2
                      ? "🥉"
                      : `${index + 1}.`}
              </span>
              <span className="pixel-text text-base font-bold truncate max-w-[150px]">
                {player.name.toUpperCase()}
                {player._id === currentPlayerId && " (YOU)"}
              </span>
            </div>
            <span className="pixel-text text-lg font-bold">{player.score}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedPlayers.map((player, index) => (
        <div
          key={player._id}
          className={`
            border-4 p-4 flex items-center justify-between
            ${
              index === 0
                ? "bg-yellow-100 border-yellow-600"
                : index === 1
                  ? "bg-gray-100 border-gray-400"
                  : index === 2
                    ? "bg-orange-100 border-orange-600"
                    : "bg-sky-50 border-sky-300"
            }
            ${player._id === currentPlayerId ? "ring-4 ring-sky-900" : ""}
          `}
        >
          <div className="flex items-center gap-4">
            <span className="pixel-text text-2xl md:text-3xl w-12">
              {index === 0
                ? "🥇"
                : index === 1
                  ? "🥈"
                  : index === 2
                    ? "🥉"
                    : `${index + 1}.`}
            </span>
            <div>
              <p className="pixel-text text-lg md:text-xl font-bold">
                {player.name.toUpperCase()}
                {player._id === currentPlayerId && " (YOU)"}
              </p>
            </div>
          </div>
          <p className="pixel-text text-2xl md:text-3xl font-bold">{player.score}</p>
        </div>
      ))}
    </div>
  );
}
