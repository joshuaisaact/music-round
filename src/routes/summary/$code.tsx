import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getSessionId } from "../../lib/session";
import { PixelButton, PlayerStandings } from "@/components";
import { useState } from "react";

export const Route = createFileRoute("/summary/$code")({
  component: Summary,
});

function Summary() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const sessionId = getSessionId();
  const [isCreatingNewGame, setIsCreatingNewGame] = useState(false);

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
  const playerAnswers = useQuery(
    api.answers.listForPlayer,
    currentPlayer ? { playerId: currentPlayer._id } : "skip",
  );

  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.players.join);

  const handlePlayAgain = async () => {
    if (!game || !currentPlayer || isCreatingNewGame) return;

    try {
      setIsCreatingNewGame(true);

      const newGame = await createGame({
        hostId: sessionId,
        settings: game.settings,
      });

      await joinGame({
        code: newGame.code,
        sessionId,
        name: currentPlayer.name,
      });

      navigate({ to: `/lobby/${newGame.code}` });
    } catch (error) {
      console.error("Failed to create new game:", error);
      setIsCreatingNewGame(false);
    }
  };

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

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const topScore = sortedPlayers[0].score;
  const winners = sortedPlayers.filter((p) => p.score === topScore);
  const isHost = currentPlayer.isHost === true;

  return (
    <div className="min-h-screen bg-sky-400 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="pixel-text text-white text-xs opacity-75">
            GAME CODE: {code}
          </p>
        </div>

        {/* Winner Announcement - only show if multiplayer */}
        {players.length > 1 && (
          <div className="bg-yellow-100 border-4 border-yellow-600 p-8 mb-6">
            <div className="text-center">
              <p className="pixel-text text-yellow-900 text-2xl md:text-4xl mb-4">
                🏆 {winners.length > 1 ? "TIE!" : "WINNER"} 🏆
              </p>
              {winners.length > 1 ? (
                <div className="space-y-2">
                  {winners.map((w) => (
                    <p
                      key={w._id}
                      className="pixel-text text-yellow-900 text-2xl md:text-4xl"
                    >
                      {w.name.toUpperCase()}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="pixel-text text-yellow-900 text-3xl md:text-5xl">
                  {winners[0].name.toUpperCase()}
                </p>
              )}
            </div>
          </div>
        )}

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

        {/* Round Breakdown */}
        {playerAnswers && rounds && (
          <div className="bg-white border-4 border-sky-900 p-6 mb-6">
            <div className="space-y-4">
              {rounds.map((round) => {
                const answer = playerAnswers.find(
                  (a) => a.roundId === round._id,
                );
                const { correctArtist, correctTitle, albumArt } = round.songData;

                return (
                  <div
                    key={round._id}
                    className="border-2 border-sky-300 p-4 bg-sky-50"
                  >
                    <div className="flex gap-4">
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <p className="pixel-text text-sky-900 text-sm font-bold mb-2">
                            ROUND {round.roundNumber + 1}
                          </p>
                          {answer && (
                            <div>
                              <p
                                className={`pixel-text text-base md:text-lg mb-1 md:mb-2 ${answer.artistCorrect ? "text-green-700" : "text-red-700"}`}
                              >
                                <span className="hidden md:inline">ARTIST: </span>
                                {(answer.artist || "(BLANK)").toUpperCase()}
                              </p>
                              <p
                                className={`pixel-text text-base md:text-lg ${answer.titleCorrect ? "text-green-700" : "text-red-700"}`}
                              >
                                <span className="hidden md:inline">TITLE: </span>
                                {(answer.title || "(BLANK)").toUpperCase()}
                              </p>
                            </div>
                          )}
                        </div>
                        <p className="pixel-text text-sky-700 text-sm md:text-lg mt-2">
                          {answer ? `+${answer.points} PTS` : "NO ANSWER"}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {albumArt && (
                          <img
                            src={albumArt}
                            alt="Album art"
                            className="w-24 h-24 border-4 border-sky-900"
                          />
                        )}
                        <div className="text-right">
                          <p className="pixel-text text-sky-900 text-sm">
                            {correctArtist.toUpperCase()}
                          </p>
                          <p className="pixel-text text-sky-900 text-sm">
                            {correctTitle.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          {isHost && (
            <PixelButton
              onClick={handlePlayAgain}
              disabled={isCreatingNewGame}
              className="w-full"
            >
              {isCreatingNewGame ? "CREATING..." : "PLAY AGAIN"}
            </PixelButton>
          )}
          <PixelButton
            onClick={() => navigate({ to: "/" })}
            className="w-full"
            size="medium"
            variant="danger"
          >
            BACK TO HOME
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
