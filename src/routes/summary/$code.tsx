import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getSessionId } from "../../lib/session";
import { PixelButton, PlayerStandings } from "@/components";

export const Route = createFileRoute("/summary/$code")({
  component: Summary,
});

function Summary() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const sessionId = getSessionId();

  const game = useQuery(api.games.getByCode, { code });
  const currentPlayer = useQuery(
    api.players.getBySession,
    game ? { gameId: game._id, sessionId } : "skip",
  );
  const players = useQuery(
    api.players.list,
    game ? { gameId: game._id } : "skip",
  );
  const rounds = useQuery(
    api.rounds.list,
    game ? { gameId: game._id } : "skip",
  );

  // Loading
  if (game === undefined || !currentPlayer || !players) {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center">
        <p className="pixel-text text-white text-xl">LOADING...</p>
      </div>
    );
  }

  // Game not found or wrong status
  if (game === null || game.status !== "finished") {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="pixel-text text-white text-xl mb-8">GAME NOT FOUND</p>
          <PixelButton onClick={() => navigate({ to: "/" })}>
            BACK TO HOME
          </PixelButton>
        </div>
      </div>
    );
  }

  const winner = [...players].sort((a, b) => b.score - a.score)[0];
  const isCurrentPlayerWinner = winner._id === currentPlayer._id;
  const totalRounds = rounds?.length || 0;

  return (
    <div className="min-h-screen bg-sky-400 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="pixel-text text-white text-xs opacity-75">
            GAME CODE: {code}
          </p>
        </div>

        {/* Winner Announcement */}
        <div className="bg-yellow-100 border-4 border-yellow-600 p-8 mb-6">
          <div className="text-center">
            <p className="pixel-text text-yellow-900 text-2xl md:text-4xl mb-4">
              🏆 WINNER 🏆
            </p>
            <p className="pixel-text text-yellow-900 text-3xl md:text-5xl mb-2">
              {winner.name.toUpperCase()}
            </p>
            <p className="pixel-text text-yellow-800 text-xl md:text-2xl">
              {winner.score} POINTS
            </p>
            {isCurrentPlayerWinner && (
              <p className="pixel-text text-yellow-700 text-sm mt-4">
                🎉 CONGRATULATIONS! 🎉
              </p>
            )}
          </div>
        </div>

        {/* Final Leaderboard */}
        <div className="bg-white border-4 border-sky-900 p-6 mb-6">
          <h2 className="pixel-text text-sky-900 text-2xl mb-6 text-center">
            FINAL STANDINGS
          </h2>

          <PlayerStandings
            players={players}
            currentPlayerId={currentPlayer._id}
            variant="detailed"
          />
        </div>

        {/* Game Stats */}
        <div className="bg-white border-4 border-sky-900 p-6 mb-6">
          <h2 className="pixel-text text-sky-900 text-xl mb-4 text-center">
            GAME STATISTICS
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-sky-50 border-2 border-sky-300">
              <p className="pixel-text text-sky-600 text-xs mb-1">
                TOTAL ROUNDS
              </p>
              <p className="pixel-text text-sky-900 text-3xl">{totalRounds}</p>
            </div>
            <div className="text-center p-4 bg-sky-50 border-2 border-sky-300">
              <p className="pixel-text text-sky-600 text-xs mb-1">PLAYERS</p>
              <p className="pixel-text text-sky-900 text-3xl">
                {players.length}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <PixelButton
            onClick={() => navigate({ to: "/" })}
            className="w-full"
          >
            BACK TO HOME
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
