import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState } from "react";
import { getSessionId } from "../../lib/session";
import { PixelButton, PixelInput } from "@/components";

export const Route = createFileRoute("/game/$code")({
  component: Game,
});

function Game() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const sessionId = getSessionId();

  const [artistGuess, setArtistGuess] = useState("");
  const [titleGuess, setTitleGuess] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState("");

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
  const currentRound = useQuery(
    api.rounds.getCurrent,
    game ? { gameId: game._id, roundNumber: game.currentRound + 1 } : "skip",
  );
  const roundAnswers = useQuery(
    api.answers.listForRound,
    currentRound ? { roundId: currentRound._id } : "skip",
  );

  const submitAnswer = useMutation(api.answers.submit);
  const nextRound = useMutation(api.games.nextRound);

  useEffect(() => {
    setArtistGuess("");
    setTitleGuess("");
    setHasSubmitted(false);
    setError("");
  }, [currentRound?._id]);

  useEffect(() => {
    if (currentPlayer && roundAnswers) {
      const myAnswer = roundAnswers.find(
        (a) => a.playerId === currentPlayer._id,
      );
      if (myAnswer) {
        setHasSubmitted(true);
        setArtistGuess(myAnswer.artist);
        setTitleGuess(myAnswer.title);
      }
    }
  }, [roundAnswers, currentPlayer]);

  const handleSubmit = async () => {
    if (!currentRound || !currentPlayer) return;

    if (!artistGuess.trim() && !titleGuess.trim()) {
      setError("Enter at least one guess!");
      return;
    }

    try {
      setError("");
      await submitAnswer({
        roundId: currentRound._id,
        playerId: currentPlayer._id,
        artist: artistGuess.trim(),
        title: titleGuess.trim(),
      });
      setHasSubmitted(true);
    } catch {
      setError("Failed to submit answer!");
    }
  };

  const handleNextRound = async () => {
    if (!game) return;
    try {
      await nextRound({ gameId: game._id });
    } catch {
      setError("Failed to advance round!");
    }
  };

  // Loading
  if (game === undefined || !currentPlayer) {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center">
        <p className="pixel-text text-white text-xl">LOADING...</p>
      </div>
    );
  }

  // Game not found or wrong status
  if (game === null || game.status !== "playing") {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="pixel-text text-white text-xl mb-8">GAME NOT ACTIVE</p>
          <PixelButton onClick={() => navigate({ to: "/" })}>
            BACK TO HOME
          </PixelButton>
        </div>
      </div>
    );
  }

  if (!currentRound) {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center">
        <p className="pixel-text text-white text-xl">LOADING ROUND...</p>
      </div>
    );
  }

  const isHost = currentPlayer.isHost === true;
  const totalRounds = rounds?.length || 0;
  const currentRoundNumber = currentRound.roundNumber;
  const sortedPlayers = [...(players || [])].sort((a, b) => b.score - a.score);
  const allPlayersSubmitted =
    (roundAnswers?.length || 0) === (players?.length || 0);

  return (
    <div className="min-h-screen bg-sky-400 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="pixel-text text-white text-xs opacity-75">{code}</p>
          <h1 className="pixel-text text-white text-2xl md:text-4xl">
            ROUND {currentRoundNumber} / {totalRounds}
          </h1>
          <p className="pixel-text text-white text-xs opacity-75">
            SCORE: {currentPlayer.score}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Game Area - Left/Top */}
          <div className="lg:col-span-2 space-y-6">
            {/* Audio Player */}
            <div className="bg-white border-4 border-sky-900 p-6">
              <h2 className="pixel-text text-sky-900 text-lg mb-4 flex items-center gap-2">
                🎵 LISTEN TO THE SONG
              </h2>

              {currentRound.songData.albumArt && (
                <div className="mb-4">
                  <img
                    src={currentRound.songData.albumArt}
                    alt="Album art"
                    className="w-32 h-32 mx-auto border-4 border-sky-900"
                  />
                </div>
              )}

              {currentRound.songData.previewURL ? (
                <audio
                  key={currentRound._id}
                  controls
                  autoPlay
                  className="w-full"
                  src={currentRound.songData.previewURL}
                >
                  Your browser does not support audio.
                </audio>
              ) : (
                <p className="pixel-text text-sky-600 text-sm">
                  NO PREVIEW AVAILABLE
                </p>
              )}
            </div>

            {/* Answer Form */}
            <div className="bg-white border-4 border-sky-900 p-6">
              {hasSubmitted ? (
                <div className="space-y-4">
                  <div className="bg-green-100 border-2 border-green-600 p-4">
                    <p className="pixel-text text-green-800 text-sm mb-2">
                      ✅ ANSWER SUBMITTED!
                    </p>
                    <p className="pixel-text text-green-700 text-xs">
                      Artist: {artistGuess || "(blank)"}
                    </p>
                    <p className="pixel-text text-green-700 text-xs">
                      Title: {titleGuess || "(blank)"}
                    </p>
                  </div>

                  <p className="pixel-text text-sky-600 text-xs text-center">
                    {allPlayersSubmitted
                      ? "ALL PLAYERS SUBMITTED!"
                      : `WAITING FOR OTHER PLAYERS... (${roundAnswers?.length}/${players?.length})`}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <PixelInput
                    type="text"
                    label="ARTIST NAME"
                    placeholder="WHO IS THE ARTIST?"
                    value={artistGuess}
                    onChange={(e) => setArtistGuess(e.target.value)}
                    className="w-full"
                  />

                  <PixelInput
                    type="text"
                    label="SONG TITLE"
                    placeholder="WHAT IS THE SONG?"
                    value={titleGuess}
                    onChange={(e) => setTitleGuess(e.target.value)}
                    onEnterPress={handleSubmit}
                    className="w-full"
                  />

                  <PixelButton onClick={handleSubmit} className="w-full">
                    SUBMIT ANSWER
                  </PixelButton>

                  {error && (
                    <div className="pixel-text pixel-error">⚠️ {error}</div>
                  )}
                </div>
              )}
            </div>

            {/* Host Controls */}
            {isHost && (
              <div className="bg-yellow-100 border-4 border-yellow-600 p-6">
                <PixelButton
                  onClick={handleNextRound}
                  variant="warning"
                  className="w-full"
                >
                  {currentRoundNumber === totalRounds
                    ? "FINISH GAME"
                    : "NEXT ROUND"}
                </PixelButton>
                {!allPlayersSubmitted && (
                  <p className="pixel-text text-yellow-800 text-xs mt-3 text-center">
                    {roundAnswers?.length}/{players?.length} PLAYERS SUBMITTED
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Leaderboard - Right/Bottom */}
          <div className="lg:col-span-1">
            <div className="bg-white border-4 border-sky-900 p-6 sticky top-4">
              <h2 className="pixel-text text-sky-900 text-lg mb-4 flex items-center gap-2">
                🏆 LEADERBOARD
              </h2>

              <div className="space-y-2">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player._id}
                    className={`
                       border-2 p-3 flex items-center justify-between
                       ${index === 0 ? "bg-yellow-100 border-yellow-600" : "bg-sky-100 border-sky-600"}
                       ${player._id === currentPlayer._id ? "ring-2 ring-sky-900" : ""}
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
                      <span className="pixel-text text-base truncate max-w-[150px]">
                        {player.name}
                        {player._id === currentPlayer._id && " (YOU)"}
                      </span>
                    </div>
                    <span className="pixel-text text-lg">{player.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
